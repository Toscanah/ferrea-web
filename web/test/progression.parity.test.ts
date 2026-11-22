import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { toDisplayMessage } from '../src/domain/mappers/progressionText'
import type { ProgressionState } from '../src/domain/model/types'
import { calculateRepsOnlyProgression } from '../src/domain/progression/singleMetricEngine'
import { makeStepScale } from '../src/domain/progression/stepScale'
import { calculateProgression } from '../src/domain/progression/workoutEngine'

// shared/golden/progression.json is written by the Kotlin GoldenFixtureTest from the real Android engines.
// Every case must come out identical here: this is what "1 to 1" means.
interface GoldenCase {
  name: string
  mode: 'WEIGHT_REPS' | 'REPS_ONLY'
  targetReps: number
  stepBase: number
  tiers: { from: number; step: number }[]
  ceiling: number
  relativeTime: number
  sets: { timestamp: number; weight: number; reps: number }[]
  expected: Record<string, unknown> & { displayLabel: string; displayMessage: string }
}

const golden = JSON.parse(
  readFileSync(new URL('../../shared/golden/progression.json', import.meta.url), 'utf-8'),
) as { cases: GoldenCase[] }

function run(c: GoldenCase): ProgressionState {
  return c.mode === 'REPS_ONLY'
    ? calculateRepsOnlyProgression(c.sets, c.ceiling, c.relativeTime)
    : calculateProgression(c.sets, c.targetReps, makeStepScale(c.stepBase, c.tiers), c.relativeTime)
}

describe('progression parity with the Android engines', () => {
  it('has the fixtures', () => {
    expect(golden.cases.length).toBeGreaterThan(300)
  })

  it.each(golden.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const state = run(c)
    const [label, message] = toDisplayMessage(state.progressionSuggestion, state.repsAtNextWeight)
    const actual = {
      category: state.category,
      nextWeight: state.nextWeight,
      backOff: state.backOff,
      suggestion: state.progressionSuggestion,
      repsAtNextWeight: state.repsAtNextWeight,
      daysCount: state.daysCount,
      setsToday: state.setsToday,
      sessionLastWeight: state.sessionLastWeight,
      sessionLastReps: state.sessionLastReps,
      latestWeight: state.latestWeight,
      latestReps: state.latestReps,
      previousWeight: state.previousWeight,
      previousReps: state.previousReps,
      previousSessionSetCount: state.previousSessionSetCount,
      lighterSession: state.lighterSession,
      staleSessionsCount: state.staleSessionsCount,
      targetMatrix: state.targetMatrix,
      displayLabel: label,
      displayMessage: message,
    }
    expect(actual).toEqual(c.expected)
  })
})
