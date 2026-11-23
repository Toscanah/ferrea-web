import { describe, expect, it } from 'vitest'
import { makeStepScale } from '../src/domain/progression/stepScale'
import { DAY_MS } from '../src/domain/progression/engineDefaults'
import { calculateProgression } from '../src/domain/progression/workoutEngine'

// Mirrors MaxTestSessionTest.kt: a session of heavy singles must not become the reference.
const now = 2_000_000_000_000
const set = (weight: number, reps: number, daysAgo: number) => ({ timestamp: now - daysAgo * DAY_MS, weight, reps })
const run = (sets: ReturnType<typeof set>[]) =>
  calculateProgression(sets, 8, makeStepScale(2.5, []), now)

describe('a max test session', () => {
  it('does not raise the target', () => {
    const state = run([set(80, 8, 10), set(100, 1, 3)])
    expect(state.nextWeight).toBe(82.5)
    expect(state.previousWeight).toBe(80)
  })
  it('a bad day at the same weight still keeps the target', () => {
    expect(run([set(80, 8, 10), set(80, 3, 3)]).nextWeight).toBe(80)
  })
  it('a single-only first session is still the only reference', () => {
    expect(run([set(100, 1, 3)]).nextWeight).toBe(100)
  })
})
