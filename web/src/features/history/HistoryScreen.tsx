import { useEffect, useState } from 'preact/hooks'
import { allExercises, setsInRange } from '../../data/repository'
import { useDataVersion } from '../../data/events'
import type { Exercise, ExerciseSet } from '../../domain/model/types'
import { formatCount } from '../../domain/formatter/formatter'
import { addDays, formatDayTitle, formatSetChip, fromDateInputValue, startOfDay, toDateInputValue, useNow } from '../../ui/util'
import { EditSetSheet } from './EditSetSheet'

interface Group {
  exercise: Exercise | undefined
  exerciseId: string
  sets: ExerciseSet[]
}

/** Every exercise of the day, in the order it was started, with its sets as tappable chips. */
export function HistoryScreen() {
  const version = useDataVersion()
  const now = useNow(60_000)
  const today = startOfDay(now)

  const [day, setDay] = useState(today)
  const [groups, setGroups] = useState<Group[]>([])
  const [editing, setEditing] = useState<{ exercise: Exercise; set: ExerciseSet } | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [list, sets] = await Promise.all([allExercises(), setsInRange(day, addDays(day, 1))])
      if (cancelled) return
      const byId = new Map(list.map((e) => [e.id, e]))
      const order: string[] = []
      const map = new Map<string, ExerciseSet[]>()
      for (const s of sets) {
        if (!map.has(s.exerciseId)) {
          map.set(s.exerciseId, [])
          order.push(s.exerciseId)
        }
        map.get(s.exerciseId)!.push(s)
      }
      setGroups(order.map((id) => ({ exercise: byId.get(id), exerciseId: id, sets: map.get(id)! })))
    })()
    return () => {
      cancelled = true
    }
  }, [day, version])

  const totalSets = groups.reduce((n, g) => n + g.sets.length, 0)
  const isToday = day === today

  return (
    <div class="screen">
      <h1 class="title">History</h1>

      <div class="day-bar">
        <button class="icon-button big" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))}>
          ‹
        </button>
        <label class="day-pick">
          <span class="day-title">{formatDayTitle(day, today)}</span>
          <input
            type="date"
            value={toDateInputValue(day)}
            max={toDateInputValue(today)}
            onChange={(e) => {
              const picked = fromDateInputValue((e.currentTarget as HTMLInputElement).value)
              if (picked !== null) setDay(Math.min(picked, today))
            }}
          />
        </label>
        <button class="icon-button big" aria-label="Next day" disabled={isToday} onClick={() => setDay(Math.min(addDays(day, 1), today))}>
          ›
        </button>
      </div>

      {!isToday ? (
        <button class="link-button center" onClick={() => setDay(today)}>
          Jump to today
        </button>
      ) : null}

      {groups.length === 0 ? (
        <div class="empty">
          <strong>No sets recorded</strong>
          <p>No workout sets logged for this date.</p>
        </div>
      ) : (
        <>
          <p class="sub">
            {formatCount(groups.length, 'exercise')} · {formatCount(totalSets, 'set')}
          </p>
          {groups.map((g) => (
            <section class="card" key={g.exerciseId}>
              <h3 class="card-title">{g.exercise ? g.exercise.name : 'Removed exercise'}</h3>
              <div class="chips">
                {g.sets.map((s) => (
                  <button
                    key={s.id}
                    class={s.isWarmup ? 'set-chip warmup' : 'set-chip'}
                    disabled={!g.exercise}
                    onClick={() => g.exercise && setEditing({ exercise: g.exercise, set: s })}
                  >
                    {s.isWarmup ? <span class="w">W</span> : null}
                    {formatSetChip(s)}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {editing ? <EditSetSheet exercise={editing.exercise} set={editing.set} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}
