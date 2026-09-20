import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit';
import { checkLimit, recordUsage } from '@/lib/entitlements';

const bodySchema = z.object({
  repoId: z.string().uuid(),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimit(clientKey(request, `monitoring:${user.id}`), { limit: 20, windowMs: 60_000 });
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const { repoId, enabled } = parsed.data;

  // Verify repo belongs to user
  const { data: repo } = await supabase.from('repos').select('id').eq('id', repoId).eq('user_id', user.id).single();
  if (!repo) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });

  if (enabled) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan,current_period_start,current_period_end,created_at')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const limitCheck = await checkLimit(supabase, user.id, 'monitored_repo', profile);
    if (!limitCheck.ok) return limitCheck.response;

    const { error } = await supabase.from('monitoring_config').upsert({ repo_id: repoId, enabled }, { onConflict: 'repo_id' });
    if (error) return NextResponse.json({ error: 'Failed to update monitoring config' }, { status: 500 });

    await recordUsage(supabase, user.id, 'monitored_repo', repoId);
  } else {
    const { error } = await supabase.from('monitoring_config').upsert({ repo_id: repoId, enabled }, { onConflict: 'repo_id' });
    if (error) return NextResponse.json({ error: 'Failed to update monitoring config' }, { status: 500 });
  }

  return NextResponse.json({ status: 'success', repoId, enabled });
}
