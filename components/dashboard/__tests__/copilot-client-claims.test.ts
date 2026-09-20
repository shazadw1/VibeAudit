import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../../..");

const copilotClient = fs.readFileSync(
  path.join(ROOT, "components/dashboard/copilot-client.tsx"),
  "utf-8"
);
const copilotPage = fs.readFileSync(
  path.join(ROOT, "app/(dashboard)/copilot/page.tsx"),
  "utf-8"
);

const forbidden = [
  "PR #117",
  "Nitro",
  "volatile",
  "SOC2 Type II",
  "ISO 27001",
  "Merkle",
  "SCIM",
  "Autonomous PR",
  "zero-retention",
  "Zero-Retention",
];

describe("copilot-client.tsx — no false product claims", () => {
  for (const phrase of forbidden) {
    it(`does not contain forbidden phrase: "${phrase}"`, () => {
      expect(copilotClient).not.toContain(phrase);
    });
  }

  it('contains the word "Demo" to indicate preview state', () => {
    expect(copilotClient).toContain("Demo");
  });
});

describe("copilot/page.tsx — no false product claims", () => {
  for (const phrase of forbidden) {
    it(`does not contain forbidden phrase: "${phrase}"`, () => {
      expect(copilotPage).not.toContain(phrase);
    });
  }
});
