import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { PrMeta } from '@devdigest/shared';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockGitHubClient } from '../src/adapters/mocks.js';
import * as t from '../src/db/schema.js';

const d = await dockerAvailable() ? describe : describe.skip;
d('PR latest persisted review summary', () => {
  let pg: PgFixture;
  let workspaceId: string;
  beforeAll(async () => { pg = await startPg(); ({ workspaceId } = await seed(pg.handle.db)); });
  afterAll(async () => { await pg?.stop(); });

  it('keeps score/counts on the same review, includes every finding, and falls back after deletion without leaking workspaces', async () => {
    const db = pg.handle.db;
    const app = await buildApp({
      config: loadConfig({ ...process.env, NODE_ENV: 'test' }), db,
      overrides: { github: new MockGitHubClient({ pulls: [] }) },
    });
    try {
      const [repo] = await db.insert(t.repos).values({ workspaceId, owner: 'test', name: 'findings', fullName: 'test/findings' }).returning();
      const prs = await db.insert(t.pullRequests).values([1, 2].map((number) => ({
        workspaceId, repoId: repo!.id, number, title: 'Findings', author: 'Ada', branch: 'feat', base: 'main', headSha: 'abc', additions: 1,
      }))).returning();
      const pr = prs[0]!;
      const list = async () => {
        const response = await app.inject({ method: 'GET', url: `/repos/${repo!.id}/pulls` });
        expect(response.statusCode).toBe(200);
        const rows = response.json<PrMeta[]>();
        expect(rows.find((row) => row.id === prs[1]!.id)?.latest_review).toBeNull();
        return rows.find((row) => row.id === pr.id)!;
      };
      expect((await list()).latest_review).toBeNull();
      const [older] = await db.insert(t.reviews).values({ workspaceId, prId: pr.id, kind: 'review', score: 98, createdAt: new Date('2026-01-01') }).returning();
      expect((await list()).latest_review).toEqual({ id: older!.id, run_id: null, counts: { critical: 0, warning: 0, suggestion: 0 } });
      const [run] = await db.insert(t.agentRuns).values({ workspaceId, prId: pr.id, status: 'done', ranAt: new Date('2026-01-02') }).returning();
      const [newer] = await db.insert(t.reviews).values({ workspaceId, prId: pr.id, runId: run!.id, kind: 'review', score: 30, createdAt: new Date('2026-01-02') }).returning();
      await db.insert(t.findings).values(['CRITICAL', 'WARNING', 'WARNING', 'SUGGESTION'].map((severity, i) => ({
        reviewId: newer!.id, severity, category: 'bug', title: 'Finding', file: 'a.ts', startLine: 1, endLine: 2,
        rationale: 'Reason', confidence: i === 3 ? 0.2 : 0.9,
        dismissedAt: i === 0 ? new Date() : null, acceptedAt: i === 1 ? new Date() : null,
      })));
      const checkLatest = async () => {
        const row = await list();
        expect(row.score).toBe(30);
        expect(row.latest_review).toEqual({ id: newer!.id, run_id: run!.id, counts: { critical: 1, warning: 2, suggestion: 1 } });
      };
      await checkLatest();
      const [unsuccessful] = await db.insert(t.agentRuns).values({ workspaceId, prId: pr.id, status: 'running', ranAt: new Date('2026-01-03') }).returning();
      await checkLatest();
      await db.update(t.agentRuns).set({ status: 'failed' }).where(eq(t.agentRuns.id, unsuccessful!.id));
      await checkLatest();
      await db.insert(t.reviews).values({ workspaceId, prId: pr.id, kind: 'summary', score: 100, createdAt: new Date('2026-01-04') });
      const [foreign] = await db.insert(t.workspaces).values({ name: 'Other findings workspace' }).returning();
      await db.insert(t.reviews).values({ workspaceId: foreign!.id, prId: pr.id, kind: 'review', score: 0, createdAt: new Date('2026-01-05') });
      const [foreignRepo] = await db.insert(t.repos).values({ workspaceId: foreign!.id, owner: 'other', name: 'findings', fullName: 'other/findings' }).returning();
      expect((await app.inject({ method: 'GET', url: `/repos/${foreignRepo!.id}/pulls` })).statusCode).toBe(404);
      await checkLatest();
      expect((await app.inject({ method: 'DELETE', url: `/reviews/${newer!.id}` })).statusCode).toBe(200);
      expect(await list()).toMatchObject({ score: 98, latest_review: { id: older!.id, run_id: null, counts: { critical: 0, warning: 0, suggestion: 0 } } });
      expect((await app.inject({ method: 'DELETE', url: `/reviews/${older!.id}` })).statusCode).toBe(200);
      expect(await list()).toMatchObject({ score: null, latest_review: null });
    } finally { await app.close(); }
  });
});
