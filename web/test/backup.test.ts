import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT_VERSION, backupFileName, buildBackup, parseBackup } from '../src/data/backup'
import { defaultExercises } from '../src/data/db'
import type { ExerciseSet } from '../src/domain/model/types'

const exercises = defaultExercises().slice(0, 3)
const set = (id: number, exerciseId: string, timestamp: number): ExerciseSet => ({
  id,
  exerciseId,
  reps: 8,
  weight: 60,
  note: '',
  timestamp,
  isWarmup: false,
  createdAt: timestamp,
  updatedAt: timestamp,
})

describe('backup file', () => {
  it('round-trips exercises and sets', () => {
    const sets = [set(2, exercises[0].id, 2000), set(1, exercises[1].id, 1000)]
    const file = buildBackup(exercises, sets, 5000)
    expect(file.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(file.weightUnit).toBe('kg')
    expect(file.sets.map((s) => s.timestamp)).toEqual([1000, 2000]) // oldest first, like Android

    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.exercises).toHaveLength(3)
    expect(parsed.sets).toHaveLength(2)
    expect(parsed.sets[0]).toMatchObject({ exerciseId: exercises[1].id, reps: 8, weight: 60, timestamp: 1000 })
    expect(parsed.skippedSets).toBe(0)
  })

  it('refuses a newer format and garbage', () => {
    expect(parseBackup(JSON.stringify({ formatVersion: BACKUP_FORMAT_VERSION + 1, exercises: [], sets: [] }))).toEqual({
      ok: false,
      reason: 'tooNew',
    })
    expect(parseBackup('not json')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseBackup('42')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseBackup(JSON.stringify({ formatVersion: 2, exercises: [], sets: [] }))).toEqual({ ok: false, reason: 'noExercises' })
  })

  it('is tolerant like the Android import: defaults for missing keys, unknown keys ignored', () => {
    const text = JSON.stringify({
      formatVersion: 1,
      somethingNew: true,
      exercises: [{ id: 'x1', name: 'Odd lift', category: 'NOPE', equipment: 'NOPE' }],
      sets: [
        { exerciseId: 'x1', reps: 5, weight: 40, timestamp: 1234, unknownKey: 1 },
        { exerciseId: 'missing', reps: 5, weight: 40, timestamp: 1234 },
      ],
    })
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.exercises[0]).toMatchObject({ category: 'OTHER', equipment: 'OTHER', progressionMode: 'WEIGHT_REPS', weightStepKg: 2.5 })
    expect(parsed.sets).toHaveLength(1)
    expect(parsed.skippedSets).toBe(1)
    expect(parsed.sets[0]).toMatchObject({ isWarmup: false, note: '', createdAt: 1234, updatedAt: 1234 })
  })

  it('accepts a bare list of sets when the exercises already exist', () => {
    const text = JSON.stringify([{ exerciseId: 'x1', reps: 5, weight: 40, timestamp: 1 }])
    expect(parseBackup(text).ok).toBe(false)
    const parsed = parseBackup(text, new Set(['x1']))
    expect(parsed.ok && parsed.sets.length).toBe(1)
  })

  it('names the file like the Android app', () => {
    expect(backupFileName(new Date(2026, 10, 9))).toBe('ferrea_backup_2026_11_09.json')
  })
})
