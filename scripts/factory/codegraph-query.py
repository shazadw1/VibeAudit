#!/usr/bin/env python3
"""Read-only queries against .codegraph/codegraph.db for task-master.sh.

Python 3 stdlib only: sqlite3, argparse, json, hashlib, os, sys, re,
subprocess (only to read `git log -1 --format=%ct` for the staleness
verdict in `status`). Never opens the database read-write. Never runs an
indexer. Never writes anything under .codegraph/.

Subcommands: search, file, symbols, related, status. Every subcommand
accepts --json (machine-readable) or, by default, a tab-separated
"human table" -- tab-separated on purpose so a caller without jq (e.g.
task-master.sh) can parse it with a plain `while IFS=$'\\t' read`.

Exit codes: 1 with a single stderr line if the database is missing or
cannot be opened read-only. 2 on a usage error. 0 otherwise (a query
that finds nothing is not an error).
"""
import argparse
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys

DEFAULT_DB = ".codegraph/codegraph.db"
DEFAULT_LIMIT = 25

# ---------------------------------------------------------------------------
# DB open (read-only, with the -shm-not-writable retry the brief calls out)
# ---------------------------------------------------------------------------


def open_db(path):
    if not os.path.isfile(path):
        sys.stderr.write("codegraph-query: database not found: %s\n" % path)
        sys.exit(1)
    abs_path = os.path.abspath(path)
    uri = "file:%s?mode=ro" % abs_path
    try:
        conn = sqlite3.connect(uri, uri=True)
        conn.execute("SELECT 1")
        return conn
    except sqlite3.OperationalError:
        pass
    try:
        uri2 = "file:%s?mode=ro&immutable=1" % abs_path
        conn = sqlite3.connect(uri2, uri=True)
        conn.execute("SELECT 1")
        return conn
    except sqlite3.OperationalError as exc:
        sys.stderr.write("codegraph-query: cannot open database read-only: %s (%s)\n" % (path, exc))
        sys.exit(1)


def repo_root_for_db(db_path):
    """The directory that .codegraph/codegraph.db's paths are relative to.

    Derived from the db path itself (parent of the .codegraph/ directory)
    so a --db pointing at the real index still resolves real source files
    even when the caller's cwd is a scratch copy of the repo that has no
    source tree of its own.
    """
    abs_db = os.path.abspath(db_path)
    parent = os.path.dirname(abs_db)
    if os.path.basename(parent) == ".codegraph":
        return os.path.dirname(parent)
    return os.getcwd()


# ---------------------------------------------------------------------------
# small formatting helpers
# ---------------------------------------------------------------------------


def _clean(value):
    """Flatten a value for a single TSV field: no tabs/newlines, no None."""
    if value is None:
        return ""
    return str(value).replace("\t", " ").replace("\n", " ").replace("\r", " ")


def emit_json(obj):
    print(json.dumps(obj))


def emit_table(rows):
    """rows: iterable of iterables. Tab-separated, one row per line."""
    for row in rows:
        print("\t".join(_clean(v) for v in row))


# ---------------------------------------------------------------------------
# search
# ---------------------------------------------------------------------------

_FTS_UNSAFE_RE = re.compile(r"[^A-Za-z0-9_ ]")


def _like_escape(value):
    """Escape a string for safe use inside a LIKE pattern with
    ESCAPE '\\': backslash first (it's the escape char itself), then the
    two LIKE wildcards. Without this, a query containing a literal `%` or
    `_` (e.g. `a_b%`) silently turns into a wildcard match instead of a
    literal one -- not a crash, but a correctness bug the caller has no way
    to see."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _search_rows(conn, query, limit):
    """Return list of (id, kind, name, file_path, start_line, end_line,
    is_exported) for `query`, FTS5 first, LIKE fallback."""
    rows = []
    if query and not _FTS_UNSAFE_RE.search(query):
        try:
            cur = conn.execute(
                "SELECT n.id, n.kind, n.name, n.file_path, n.start_line, "
                "n.end_line, n.is_exported "
                "FROM nodes_fts f JOIN nodes n ON n.rowid = f.rowid "
                "WHERE nodes_fts MATCH ? LIMIT ?",
                (query, limit),
            )
            rows = cur.fetchall()
        except sqlite3.OperationalError:
            rows = []
    if not rows:
        like = "%%%s%%" % _like_escape(query)
        cur = conn.execute(
            "SELECT id, kind, name, file_path, start_line, end_line, is_exported "
            "FROM nodes WHERE name LIKE ? ESCAPE '\\' OR qualified_name LIKE ? ESCAPE '\\' "
            "OR file_path LIKE ? ESCAPE '\\' LIMIT ?",
            (like, like, like, limit),
        )
        rows = cur.fetchall()
    return rows


def cmd_search(conn, args):
    rows = _search_rows(conn, args.query, args.limit)
    out_rows = [
        {
            "kind": r[1],
            "name": r[2],
            "file_path": r[3],
            "start_line": r[4],
            "end_line": r[5],
            "is_exported": bool(r[6]),
        }
        for r in rows
    ]
    if args.json:
        emit_json(out_rows)
    else:
        emit_table(
            (r["kind"], r["name"], r["file_path"], r["start_line"], r["end_line"], int(r["is_exported"]))
            for r in out_rows
        )


# ---------------------------------------------------------------------------
# file
# ---------------------------------------------------------------------------


def cmd_file(conn, args):
    cur = conn.execute(
        "SELECT path, content_hash, language, size, modified_at, indexed_at, node_count, errors "
        "FROM files WHERE path = ?",
        (args.path,),
    )
    file_row = cur.fetchone()
    cur = conn.execute(
        "SELECT kind, name, qualified_name, start_line, end_line, signature, docstring, is_exported "
        "FROM nodes WHERE file_path = ? ORDER BY start_line",
        (args.path,),
    )
    node_rows = cur.fetchall()
    if args.json:
        emit_json(
            {
                "file": None
                if file_row is None
                else {
                    "path": file_row[0],
                    "content_hash": file_row[1],
                    "language": file_row[2],
                    "size": file_row[3],
                    "modified_at": file_row[4],
                    "indexed_at": file_row[5],
                    "node_count": file_row[6],
                    "errors": file_row[7],
                },
                "nodes": [
                    {
                        "kind": n[0],
                        "name": n[1],
                        "qualified_name": n[2],
                        "start_line": n[3],
                        "end_line": n[4],
                        "signature": n[5],
                        "docstring": n[6],
                        "is_exported": bool(n[7]),
                    }
                    for n in node_rows
                ],
            }
        )
    else:
        if file_row is not None:
            emit_table([("FILE",) + tuple(file_row)])
        for n in node_rows:
            emit_table([("NODE",) + tuple(n)])


# ---------------------------------------------------------------------------
# symbols
# ---------------------------------------------------------------------------


def cmd_symbols(conn, args):
    cur = conn.execute(
        "SELECT kind, name, qualified_name, start_line, end_line, signature "
        "FROM nodes WHERE file_path = ? AND is_exported = 1 ORDER BY start_line",
        (args.path,),
    )
    rows = cur.fetchall()
    if args.json:
        emit_json(
            [
                {
                    "kind": r[0],
                    "name": r[1],
                    "qualified_name": r[2],
                    "start_line": r[3],
                    "end_line": r[4],
                    "signature": r[5],
                }
                for r in rows
            ]
        )
    else:
        emit_table(rows)


# ---------------------------------------------------------------------------
# related
# ---------------------------------------------------------------------------


def _resolve_ids(conn, arg, limit):
    """Resolve `arg` to (mode, [node_id...]). mode is 'path' if arg matches
    a files.path exactly, else 'query' (via _search_rows)."""
    cur = conn.execute("SELECT 1 FROM files WHERE path = ?", (arg,))
    if cur.fetchone() is not None:
        cur = conn.execute("SELECT id FROM nodes WHERE file_path = ?", (arg,))
        return "path", [r[0] for r in cur.fetchall()]
    rows = _search_rows(conn, arg, limit)
    return "query", [r[0] for r in rows]


def cmd_related(conn, args):
    mode, ids = _resolve_ids(conn, args.query, args.limit)
    id_set = set(ids)
    grouped = {}
    if ids:
        placeholders = ",".join("?" for _ in ids)
        cur = conn.execute(
            "SELECT kind, source, target, line FROM edges "
            "WHERE source IN (%s) OR target IN (%s)" % (placeholders, placeholders),
            ids + ids,
        )
        for kind, source, target, line in cur.fetchall():
            if source in id_set and target in id_set:
                continue  # internal to the resolved set, not "related"
            if source in id_set:
                peer_id, direction = target, "out"
            else:
                peer_id, direction = source, "in"
            peer = conn.execute(
                "SELECT name, file_path FROM nodes WHERE id = ?", (peer_id,)
            ).fetchone()
            peer_name = peer[0] if peer else peer_id
            peer_file = peer[1] if peer else ""
            grouped.setdefault(kind, []).append(
                {"direction": direction, "peer_name": peer_name, "peer_file": peer_file, "line": line}
            )

    unresolved = []
    if args.query:
        like = "%%%s%%" % _like_escape(args.query)
        cur = conn.execute(
            "SELECT reference_name, reference_kind, file_path, line "
            "FROM unresolved_refs WHERE reference_name LIKE ? ESCAPE '\\' LIMIT ?",
            (like, args.limit),
        )
        unresolved = [
            {"reference_name": r[0], "reference_kind": r[1], "file_path": r[2], "line": r[3]}
            for r in cur.fetchall()
        ]

    if args.json:
        emit_json({"mode": mode, "node_ids": ids, "edges": grouped, "unresolved_refs": unresolved})
    else:
        for kind, items in grouped.items():
            for item in items:
                emit_table([("EDGE", kind, item["direction"], item["peer_name"], item["peer_file"], item["line"])])
        for u in unresolved:
            emit_table([("UNRESOLVED", u["reference_name"], u["reference_kind"], u["file_path"], u["line"])])


# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------


def _head_commit_time(repo_root):
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%ct"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if out.returncode != 0:
            return None
        text = out.stdout.strip()
        return int(text) if text.isdigit() else None
    except Exception:
        return None


def cmd_status(conn, args):
    cur = conn.execute("SELECT key, value, updated_at FROM project_metadata")
    metadata = {row[0]: row[1] for row in cur.fetchall()}

    cur = conn.execute("SELECT path, content_hash, indexed_at FROM files")
    file_rows = cur.fetchall()
    file_count = len(file_rows)
    newest_indexed_at = max((r[2] for r in file_rows if r[2] is not None), default=None)

    repo_root = repo_root_for_db(args.db)
    mismatched = []
    for path, content_hash, _indexed_at in file_rows:
        disk_path = os.path.join(repo_root, path)
        try:
            with open(disk_path, "rb") as fh:
                digest = hashlib.sha256(fh.read()).hexdigest()
        except OSError:
            mismatched.append(path)
            continue
        if digest != content_hash:
            mismatched.append(path)

    stale_reasons = []
    if mismatched:
        stale_reasons.append("content_hash_mismatch")
    head_ct = _head_commit_time(repo_root)
    newest_indexed_s = (newest_indexed_at / 1000.0) if newest_indexed_at is not None else None
    if head_ct is not None and newest_indexed_s is not None and newest_indexed_s < head_ct:
        stale_reasons.append("index_older_than_head")

    result = {
        "project_metadata": metadata,
        "file_count": file_count,
        "newest_indexed_at": newest_indexed_at,
        "stale": bool(stale_reasons),
        "stale_reasons": stale_reasons,
        "mismatched_files": mismatched[:20],
    }
    if args.json:
        emit_json(result)
    else:
        for key, value in metadata.items():
            emit_table([("META", key, value)])
        emit_table([("FILES", file_count)])
        emit_table([("NEWEST_INDEXED_AT", newest_indexed_at)])
        emit_table([("STALE", "yes" if result["stale"] else "no")])
        for reason in stale_reasons:
            emit_table([("STALE_REASON", reason)])
        for path in result["mismatched_files"]:
            emit_table([("MISMATCH", path)])


# ---------------------------------------------------------------------------
# argparse plumbing
# ---------------------------------------------------------------------------


def build_parser():
    # Real defaults live on the top-level parser only. The copy shared by
    # every subparser uses argparse.SUPPRESS defaults so that, when --db/
    # --limit/--json is given *before* the subcommand name (parsed by the
    # top-level parser), the subparser's own parse step does not stomp it
    # back to the default when the flag isn't repeated after the
    # subcommand -- a documented argparse quirk when a parent and a child
    # parser share a dest.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--db", default=DEFAULT_DB, help="path to codegraph.db (default: %s)" % DEFAULT_DB)
    common.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help="max rows (default: %d)" % DEFAULT_LIMIT)
    common.add_argument("--json", action="store_true", help="emit JSON instead of a tab-separated table")

    common_sub = argparse.ArgumentParser(add_help=False)
    common_sub.add_argument("--db", default=argparse.SUPPRESS)
    common_sub.add_argument("--limit", type=int, default=argparse.SUPPRESS)
    common_sub.add_argument("--json", action="store_true", default=argparse.SUPPRESS)

    parser = argparse.ArgumentParser(
        prog="codegraph-query.py",
        description="Read-only queries against .codegraph/codegraph.db",
        parents=[common],
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_search = sub.add_parser("search", parents=[common_sub], help="FTS5/LIKE search over nodes")
    p_search.add_argument("query")
    p_search.set_defaults(func=cmd_search)

    p_file = sub.add_parser("file", parents=[common_sub], help="a files row plus its nodes")
    p_file.add_argument("path")
    p_file.set_defaults(func=cmd_file)

    p_symbols = sub.add_parser("symbols", parents=[common_sub], help="exported nodes in a file")
    p_symbols.add_argument("path")
    p_symbols.set_defaults(func=cmd_symbols)

    p_related = sub.add_parser("related", parents=[common_sub], help="edges + unresolved refs touching a query/path")
    p_related.add_argument("query")
    p_related.set_defaults(func=cmd_related)

    p_status = sub.add_parser("status", parents=[common_sub], help="index metadata and staleness verdict")
    p_status.set_defaults(func=cmd_status)

    return parser


def main(argv):
    parser = build_parser()
    args = parser.parse_args(argv)
    conn = open_db(args.db)
    try:
        args.func(conn, args)
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
