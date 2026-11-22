import type { TargetOption } from '../model/types'
import { calculateIntensityMatch, f } from './math'
import { next, previous, type StepScale } from './stepScale'

interface Candidate {
  offset: number
  option: TargetOption
}

/** The LIGHTER | TARGET | HEAVIER options around the next weight (port of TargetMatrixCalculator.kt). */
export function calculateMatrix(
  effectiveNextWeight: number,
  todayWeight: number,
  refWeight: number,
  today1RM: number,
  targetReps: number,
  scale: StepScale,
  matrixSpread: number,
): TargetOption[] {
  const baseReps = targetReps

  const center =
    effectiveNextWeight > 0 ? effectiveNextWeight
    : todayWeight > 0 ? todayWeight
    : refWeight > 0 ? refWeight
    : scale.base > 0 ? scale.base
    : 0

  const factor = f(1 + f(baseReps / 30))
  const matrixTarget1RM =
    effectiveNextWeight > 0 ? f(effectiveNextWeight * factor)
    : today1RM > 0 ? today1RM
    : center > 0 ? f(center * factor)
    : 0

  const candidates: Candidate[] = [{ offset: 0, option: { weight: center, reps: baseReps } }]

  let up = center
  for (let offset = 1; offset <= matrixSpread; offset++) {
    up = Math.max(scale.base, next(scale, up))
    candidates.push({ offset, option: { weight: up, reps: calculateIntensityMatch(matrixTarget1RM, up, baseReps) } })
  }

  let down = center
  for (let offset = 1; offset <= matrixSpread; offset++) {
    down = Math.max(scale.base, previous(scale, down))
    candidates.push({
      offset: -offset,
      option: { weight: down, reps: calculateIntensityMatch(matrixTarget1RM, down, baseReps) },
    })
  }

  // One option per weight: the nearest to the centre wins, the centre itself on a tie.
  const byWeight = new Map<number, Candidate[]>()
  for (const c of candidates) {
    const list = byWeight.get(c.option.weight)
    if (list) list.push(c)
    else byWeight.set(c.option.weight, [c])
  }
  const chosen: TargetOption[] = []
  for (const list of byWeight.values()) {
    let best = list[0]
    for (const c of list.slice(1)) {
      const d = Math.abs(c.offset) - Math.abs(best.offset)
      const tie = d === 0 ? (c.offset === 0 ? 1 : 0) - (best.offset === 0 ? 1 : 0) : 0
      if (d < 0 || (d === 0 && tie > 0)) best = c
    }
    chosen.push(best.option)
  }
  return chosen.sort((a, b) => a.weight - b.weight)
}
