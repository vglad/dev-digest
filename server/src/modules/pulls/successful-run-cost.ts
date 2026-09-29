import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { agentRuns, runTraces } from '../../db/schema.js';

/** Sum known costs of successful runs; unknown costs never erase known spend. */
export async function successfulRunCosts(db: Db, workspaceId: string, prIds: string[]) {
  const totals = new Map<string, number>();
  if (prIds.length === 0) return totals;
  const rows = await db.select({
    prId: agentRuns.prId,
    cost: sql<unknown>`${runTraces.trace}->'stats'->'cost_usd'`,
  }).from(agentRuns)
    .innerJoin(runTraces, eq(runTraces.runId, agentRuns.id))
    .where(and(eq(agentRuns.workspaceId, workspaceId), inArray(agentRuns.prId, prIds), eq(agentRuns.status, 'done')));
  for (const { prId, cost } of rows) {
    if (prId && typeof cost === 'number' && Number.isFinite(cost) && cost >= 0) {
      totals.set(prId, (totals.get(prId) ?? 0) + cost);
    }
  }
  return totals;
}
