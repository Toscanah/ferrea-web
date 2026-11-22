import { EngineDefaults } from './engineDefaults'

/** Splits sets into sessions: a gap of the threshold or more starts a new one. Input is NEWEST FIRST. */
export function groupIntoSessions<T extends { timestamp: number }>(
  sortedNewestFirst: T[],
  thresholdMs: number = EngineDefaults.SESSION_THRESHOLD_MS,
): T[][] {
  if (sortedNewestFirst.length === 0) return []
  const sessions: T[][] = []
  let current: T[] = [sortedNewestFirst[0]]
  for (let i = 1; i < sortedNewestFirst.length; i++) {
    const gap = sortedNewestFirst[i - 1].timestamp - sortedNewestFirst[i].timestamp
    if (gap < thresholdMs) {
      current.push(sortedNewestFirst[i])
    } else {
      sessions.push(current)
      current = [sortedNewestFirst[i]]
    }
  }
  sessions.push(current)
  return sessions
}

/** Kotlin's maxWithOrNull: the first of several equal maxima wins. */
export function maxWith<T>(items: T[], compare: (a: T, b: T) => number): T | undefined {
  let best: T | undefined
  for (const item of items) if (best === undefined || compare(best, item) < 0) best = item
  return best
}
