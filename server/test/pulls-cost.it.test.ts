import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import type { PrMeta, RunSummary } from '@devdigest/shared';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockGitHubClient } from '../src/adapters/mocks.js';
import * as t from '../src/db/schema.js';

const d = await dockerAvailable() ? describe : describe.skip;

d('successful run cost (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;
  beforeAll(async () => {
    pg = await startPg();
    ({ workspaceId } = await seed(pg.handle.db));
  });
  afterAll(async () => { await pg?.stop(); });

  it('sums successful costs, ignores unknown and unsuccessful runs, isolates workspaces, and subtracts deleted runs', async () => {
    const db = pg.handle.db;
    const gh = new MockGitHubClient({ pulls: [] });
    const app = await buildApp({
      config: loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv),
      db, overrides: { github: gh },
    });
    try {
      const [repo] = await db.insert(t.repos).values({ workspaceId, owner: 'test', name: 'cost', fullName: 'test/cost' }).returning();
      const prs = await db.insert(t.pullRequests).values([1, 2].map((number) => ({
        workspaceId, repoId: repo!.id, number, title: 'Cost', author: 'Ada',
        branch: 'feature', base: 'main', headSha: 'abc', status: 'open', additions: 1,
      }))).returning();
      const pr = prs[0]!;
      async function check(expected: number | null) {
        const list = await app.inject({ method: 'GET', url: `/repos/${repo!.id}/pulls` });
        expect(list.statusCode).toBe(200);
        const rows = list.json<PrMeta[]>();
        expect(rows.find((p) => p.id === pr.id)?.total_run_cost_usd).toBe(expected);
        expect(rows.find((p) => p.id === prs[1]!.id)?.total_run_cost_usd).toBeNull();
        const detail = await app.inject({ method: 'GET', url: `/pulls/${pr.id}` });
        expect(detail.statusCode).toBe(200);
        expect(detail.json().total_run_cost_usd).toBe(expected);
      }
      async function history() {
        const response = await app.inject({ method: 'GET', url: `/pulls/${pr.id}/runs` });
        expect(response.statusCode).toBe(200);
        return response.json<RunSummary[]>();
      }
      async function checkRun(runId: string, expected: number | null) {
        expect((await history()).find((run) => run.run_id === runId)?.cost_usd).toBe(expected);
      }
      async function addRun(id: string, date: string, status: string, stats?: object, ws = workspaceId) {
        await db.insert(t.agentRuns).values({ id, workspaceId: ws, prId: pr.id, ranAt: new Date(date), status });
        if (stats) await db.insert(t.runTraces).values({ runId: id, trace: { stats, log: ['not needed by the cost lookup'] } });
      }
      const older = '00000000-0000-4000-8000-000000000001';
      const newer = '00000000-0000-4000-8000-000000000002';
      const tied = '00000000-0000-4000-8000-000000000003';
      await check(null);
      await addRun(older, '2026-01-01', 'done', { cost_usd: 0.1234 });
      await check(0.1234);
      await checkRun(older, 0.1234);
      await addRun(newer, '2026-01-02', 'running');
      await check(0.1234);
      await checkRun(newer, null);
      await db.update(t.agentRuns).set({ status: 'failed' }).where(eq(t.agentRuns.id, newer));
      await db.insert(t.runTraces).values({ runId: newer, trace: { stats: {} } });
      await check(0.1234); // unknown costs do not erase successful spend
      await checkRun(newer, null);
      await db.update(t.runTraces).set({ trace: { stats: { cost_usd: null } } }).where(eq(t.runTraces.runId, newer));
      await check(0.1234);
      await checkRun(newer, null);
      await db.update(t.runTraces).set({ trace: { stats: { cost_usd: 0 } } }).where(eq(t.runTraces.runId, newer));
      await check(0.1234);
      await checkRun(newer, 0);
      await db.update(t.runTraces).set({ trace: { stats: { cost_usd: -0.1 } } }).where(eq(t.runTraces.runId, newer));
      await check(0.1234);
      await checkRun(newer, null);
      await db.update(t.runTraces).set({ trace: { stats: { cost_usd: '0.7' } } }).where(eq(t.runTraces.runId, newer));
      await check(0.1234);
      await checkRun(newer, null);
      await db.update(t.runTraces).set({ trace: { stats: { cost_usd: 0 } } }).where(eq(t.runTraces.runId, newer));
      await addRun(tied, '2026-01-02', 'done', { cost_usd: 0.5 });
      await check(0.6234); // both successful runs contribute
      await checkRun(tied, 0.5);

      await db.update(t.agentRuns).set({ status: 'done' }).where(eq(t.agentRuns.id, newer));
      await check(0.6234); // zero is a known successful cost
      for (const cost of [null, -1, '0.7']) {
        await db.update(t.runTraces).set({ trace: { stats: { cost_usd: cost } } }).where(eq(t.runTraces.runId, newer));
        await check(0.6234);
      }
      await db.update(t.runTraces).set({ trace: { stats: { cost_usd: 5 } } }).where(eq(t.runTraces.runId, newer));
      await db.update(t.agentRuns).set({ status: 'cancelled' }).where(eq(t.agentRuns.id, newer));
      await check(0.6234);
      // A free successful run is distinguishable from a PR with no known cost.
      await db.insert(t.agentRuns).values({ id: '00000000-0000-4000-8000-000000000005', workspaceId, prId: prs[1]!.id, status: 'done' });
      await db.insert(t.runTraces).values({ runId: '00000000-0000-4000-8000-000000000005', trace: { stats: { cost_usd: 0 } } });
      const freeList = await app.inject({ method: 'GET', url: `/repos/${repo!.id}/pulls` });
      expect(freeList.json<PrMeta[]>().find((p) => p.id === prs[1]!.id)?.total_run_cost_usd).toBe(0);
      await db.delete(t.agentRuns).where(eq(t.agentRuns.id, '00000000-0000-4000-8000-000000000005'));

      const [other] = await db.insert(t.workspaces).values({ name: 'Other' }).returning();
      await addRun('00000000-0000-4000-8000-000000000004', '2026-01-03', 'done', { cost_usd: 99 }, other!.id);
      await check(0.6234); // even a mismatched run workspace cannot leak metadata
      expect((await history()).some((run) => run.run_id === '00000000-0000-4000-8000-000000000004')).toBe(false);
      const [foreignRepo] = await db.insert(t.repos).values({ workspaceId: other!.id, owner: 'other', name: 'cost', fullName: 'other/cost' }).returning();
      const [foreignPr] = await db.insert(t.pullRequests).values({ ...pr, id: undefined, workspaceId: other!.id, repoId: foreignRepo!.id }).returning();
      expect((await app.inject({ method: 'GET', url: `/pulls/${foreignPr!.id}` })).statusCode).toBe(404);
      expect((await app.inject({ method: 'GET', url: `/repos/${foreignRepo!.id}/pulls` })).statusCode).toBe(404);

      vi.spyOn(gh, 'getPullRequest').mockRejectedValue(new Error('offline'));
      vi.spyOn(gh, 'listPullRequests').mockRejectedValue(new Error('offline'));
      await check(0.6234);
      expect((await app.inject({ method: 'DELETE', url: `/runs/${tied}` })).statusCode).toBe(200);
      await check(0.1234);
      expect((await app.inject({ method: 'DELETE', url: `/runs/${newer}` })).statusCode).toBe(200);
      await check(0.1234);
    } finally {
      await app.close();
    }
  });
});
