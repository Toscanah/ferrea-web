import { useEffect, useState } from 'preact/hooks'
import { formatSetCompact } from '../domain/formatter/formatter'
import type { ExerciseSet } from '../domain/model/types'

/** The current time, refreshed every [everyMs]. */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(id)
  }, [everyMs])
  return now
}

export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function addDays(dayStart: number, days: number): number {
  const d = new Date(dayStart)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** "2026-11-22", the value format of a date input, in local time. */
export function toDateInputValue(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateInputValue(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
}

export function formatDayTitle(dayStart: number, today: number): string {
  if (dayStart === today) return 'Today'
  if (dayStart === addDays(today, -1)) return 'Yesterday'
  return new Date(dayStart).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}

export const formatClock = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

/** "80kg × 8", "12 reps", or "45s" for a hold imported from the Android app. */
export function formatSetChip(set: Pick<ExerciseSet, 'weight' | 'reps' | 'durationSeconds'>): string {
  if (set.durationSeconds != null) return `${set.durationSeconds}s`
  return formatSetCompact(set.weight, set.reps)
}

/** Parses "82.5" or "82,5". Blank is 0, anything else that is not a number is null. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return 0
  if (!/^\d*\.?\d*$/.test(t) || t === '.') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function loadPref(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function savePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode: the app still works, it just forgets this preference.
  }
}
