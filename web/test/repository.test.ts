import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests, defaultExercises } from '../src/data/db'
import {
  addExercise,
  addSet,
  allExercises,
  allSets,
  deleteSets,
  listExercises,
  replaceAll,
  restoreSets,
  setsForExercise,
  setsInRange,
  updateSet,
} from '../src/data/repository'
import { buildLoggedSet } from '../src/domain/progression/exerciseProgression'

const bench = defaultExercises().find((e) => e.name === 'Barbell Bench Press')!

async function freshDb(): Promise<void> {
  await resetDbForTests()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('ferrea')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

describe('the local database', () => {
  beforeEach(freshDb)

  it('starts with the bundled exercises and no timed holds', async () => {
    const list = await listExercises()
    expect(list.length).toBe(62)
    expect(list.some((e) => e.progressionMode === 'TIMED')).toBe(false)
  })

  it('logs, edits, deletes and restores a set exactly', async () => {
    const t = 1_700_000_000_000
    const saved = await addSet(buildLoggedSet(bench, 8, 60, t, false, 8, t))
    expect(saved.id).toBeGreaterThan(0)
    expect(saved).toMatchObject({ stepKgAtLog: 2.5, targetRepsAtLog: 8, plannedSetsAtLog: 3 })

    await updateSet({ ...saved, reps: 9 })
    expect((await setsForExercise(bench.id))[0].reps).toBe(9)

    const [row] = await setsForExercise(bench.id)
    await deleteSets([row.id])
    expect(await allSets()).toHaveLength(0)
    await restoreSets([row])
    expect(await allSets()).toEqual([row])
  })

  it('finds sets by day range, end exclusive', async () => {
    const base = 1_700_000_000_000
    for (const dt of [0, 1000, 5000]) await addSet(buildLoggedSet(bench, 8, 60, base + dt, false, 8, base))
    expect(await setsInRange(base, base + 5000)).toHaveLength(2)
    expect(await setsInRange(base + 1, base + 6000)).toHaveLength(2)
  })

  it('adds a user exercise and keeps it across a restore', async () => {
    const mine = await addExercise('  Cable curl ', 'ARMS', true)
    expect(mine.name).toBe('Cable curl')
    expect((await listExercises()).some((e) => e.id === mine.id)).toBe(true)

    await replaceAll([mine], [])
    expect((await allExercises()).some((e) => e.id === mine.id)).toBe(true)
  })

  it('a restore replaces every set', async () => {
    await addSet(buildLoggedSet(bench, 8, 60, 1000, false, 8, 1000))
    await replaceAll([], [buildLoggedSet(bench, 5, 40, 2000, false, 8, 2000), buildLoggedSet(bench, 5, 42.5, 3000, false, 8, 3000)])
    const sets = await allSets()
    expect(sets).toHaveLength(2)
    expect(sets.map((s) => s.weight).sort()).toEqual([40, 42.5])
  })
})
