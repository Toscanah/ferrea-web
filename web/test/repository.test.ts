import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests, defaultExercises } from '../src/data/db'
import { bench } from './fixtures'
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

  it('starts with the bundled schedule and no timed holds', async () => {
    const list = await listExercises()
    expect(list.length).toBe(defaultExercises().length)
    expect(list.length).toBe(22)
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

  it('drops the old longer default list when untouched, keeping used and edited ones', async () => {
    // A database as the first release left it: seed version 1, with extra defaults.
    const old = await openDB('ferrea', 1, {
      upgrade(database) {
        database.createObjectStore('exercises', { keyPath: 'id' })
        const sets = database.createObjectStore('sets', { keyPath: 'id', autoIncrement: true })
        sets.createIndex('byExercise', 'exerciseId')
        sets.createIndex('byTime', 'timestamp')
        database.createObjectStore('meta')
      },
    })
    await old.put('exercises', { ...bench, id: '900' })
    await old.put('exercises', { ...bench, id: '901' })
    await old.put('exercises', { ...bench, id: '902', isUserEdited: true })
    await old.put('exercises', { ...bench, id: 'uabc' })
    await old.add('sets', buildLoggedSet({ ...bench, id: '901' }, 8, 60, 1000, false, 8, 1000))
    await old.put('meta', 1, 'seedVersion')
    old.close()

    const ids = new Set((await allExercises()).map((e) => e.id))
    expect(ids.has('900')).toBe(false) // unused default: removed
    expect(ids.has('901')).toBe(true) // has a set
    expect(ids.has('902')).toBe(true) // edited
    expect(ids.has('uabc')).toBe(true) // user-added
    expect(ids.has('1')).toBe(true) // in the new list
  })
})
