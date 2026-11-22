import { describe, expect, it } from 'vitest'
import { distance, matchesSearch } from '../src/domain/search/exerciseSearch'

// The same cases as the Android ExerciseSearchTest.
describe('exercise search', () => {
  const m = matchesSearch

  it('blank query matches everything, and spaces do not break it', () => {
    expect(m('Barbell Bench Press', '')).toBe(true)
    expect(m('Barbell Bench Press', '   ')).toBe(true)
    expect(m('Barbell Bench Press', 'bench ')).toBe(true)
    expect(m('Barbell Bench Press', ' bench')).toBe(true)
    expect(m('Barbell Bench Press', 'bench   press ')).toBe(true)
  })

  it('ignores case and accents, and the words can come in any order', () => {
    expect(m('Barbell Bench Press', 'BENCH')).toBe(true)
    expect(m('Pull-up', 'pull up')).toBe(true)
    expect(m('Crème Curl', 'creme')).toBe(true)
    expect(m('Barbell Bench Press', 'press bench')).toBe(true)
    expect(m('Barbell Bench Press', 'bench squat')).toBe(false)
  })

  it('forgives a small typo in words of four letters or more', () => {
    expect(m('Barbell Bench Press', 'benhc')).toBe(true)
    expect(m('Barbell Bench Press', 'bnch')).toBe(true)
    expect(m('Dumbbell Romanian Deadlift', 'romainan')).toBe(true)
    expect(m('Machine Leg Extension', 'legg extention')).toBe(true)
    expect(m('Dumbbell Romanian Deadlift', 'romaina')).toBe(true)
  })

  it('short words must match exactly, and unrelated words do not match', () => {
    expect(m('Barbell Bench Press', 'bnh')).toBe(false)
    expect(m('Machine Leg Extension', 'lag')).toBe(false)
    expect(m('Barbell Bench Press', 'squat')).toBe(false)
  })

  it('counts a swap as one edit', () => {
    expect(distance('bench', 'benhc')).toBe(1)
    expect(distance('press', 'pres')).toBe(1)
    expect(distance('press', 'prssx')).toBe(2)
  })
})
