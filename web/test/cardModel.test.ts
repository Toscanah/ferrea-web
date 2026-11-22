import { describe, expect, it } from 'vitest'
import { defaultExercises } from '../src/data/db'
import { buildCardModel, prefillFor } from '../src/domain/mappers/cardModel'
import type { Exercise, ExerciseSet } from '../src/domain/model/types'
import { DAY_MS, MINUTE_MS } from '../src/domain/progression/engineDefaults'
import { progressionFor } from '../src/domain/progression/exerciseProgression'

const bench = defaultExercises().find((e) => e.name === 'Barbell Bench Press') as Exercise
const pushUp = defaultExercises().find((e) => e.name === 'Bodyweight Push-Up') as Exercise
const t0 = 1_700_000_000_000

let id = 0
const set = (exercise: Exercise, weight: number, reps: number, at: number): ExerciseSet => ({
  id: ++id,
  exerciseId: exercise.id,
  weight,
  reps,
  note: '',
  timestamp: at,
  isWarmup: false,
  createdAt: at,
  updatedAt: at,
})

describe('the target card', () => {
  it('a new exercise says first session and asks for any weight', () => {
    const model = buildCardModel(bench, progressionFor(bench, [], t0))
    expect(model).toMatchObject({ kind: 'first', headerLeft: 'FIRST SESSION', targetValue: 'Any weight × 8' })
  })

  it('before the first set of a session it shows lighter, target and heavier', () => {
    // Last session: 60kg x 8 cleared the 8-rep target, so the target moves up one step.
    const sets = [set(bench, 60, 8, t0)]
    const state = progressionFor(bench, sets, t0 + DAY_MS)
    const model = buildCardModel(bench, state)
    expect(model.kind).toBe('tracked')
    if (model.kind !== 'tracked') return
    expect(model.headerLeft).toBe('NEW TARGET')
    expect(model.headerRight).toBe('Last: 60kg × 8')
    expect(model.body.kind).toBe('matrix')
    if (model.body.kind !== 'matrix') return
    expect(model.body.columns.map((c) => c.label)).toEqual(['LIGHTER', 'TARGET', 'HEAVIER'])
    expect(model.body.columns[1].value).toBe('62.5kg × 8')
    expect(prefillFor(state)).toEqual({ reps: '8', weight: '60' })
  })

  it('after clearing the target it says so and offers the next one', () => {
    const sets = [set(bench, 60, 8, t0), set(bench, 62.5, 8, t0 + DAY_MS)]
    const state = progressionFor(bench, sets, t0 + DAY_MS + 5 * MINUTE_MS)
    const model = buildCardModel(bench, state)
    expect(model.kind === 'tracked' && model.goalReached).toBe(true)
    if (model.kind !== 'tracked' || model.body.kind !== 'matrix') throw new Error('expected a matrix')
    expect(model.headerLeft).toBe('GOAL REACHED · 62.5kg × 8')
    expect(model.body.caption).toBe('Target cleared. Advance, repeat, or back-off.')
    const center = model.body.columns.find((c) => c.primary)!
    expect(center).toMatchObject({ label: 'NEXT', value: '65kg × 8' })
  })

  it('a reps-only exercise shows a plain reps target', () => {
    const sets = [set(pushUp, 0, 12, t0)]
    const model = buildCardModel(pushUp, progressionFor(pushUp, sets, t0 + DAY_MS))
    expect(model.kind === 'tracked' && model.body).toEqual({ kind: 'repsTarget', target: '13 reps', caption: 'Last session best: 12 reps.' })
  })

  it('warm-ups never move the target', () => {
    const warm = { ...set(bench, 20, 12, t0), isWarmup: true }
    const state = progressionFor(bench, [warm], t0 + DAY_MS)
    expect(state.daysCount).toBe(0)
  })
})
