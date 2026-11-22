import { formatWeight } from '../domain/progression/math'
import { next, previous, type StepScale } from '../domain/progression/stepScale'
import { parseDecimal } from './util'

// The plus and minus buttons of the weight and reps fields, as plain functions on the field text.

/** Plus on weight: the exercise's first step from empty, then one step up the ladder. */
export function weightPlus(text: string, scale: StepScale): string {
  const current = parseDecimal(text) ?? 0
  return formatWeight(current <= 0 ? scale.base : next(scale, current))
}

/** Minus on weight: one step down, and empty once it cannot go lower. */
export function weightMinus(text: string, scale: StepScale): string {
  const current = parseDecimal(text) ?? 0
  if (current <= 0) return ''
  const prev = previous(scale, current)
  return prev === current ? '' : formatWeight(prev)
}

export function repsPlus(text: string): string {
  const n = Number.parseInt(text, 10)
  return String((Number.isFinite(n) ? n : 0) + 1)
}

export function repsMinus(text: string): string {
  const n = Number.parseInt(text, 10)
  return !Number.isFinite(n) || n <= 1 ? '' : String(n - 1)
}
