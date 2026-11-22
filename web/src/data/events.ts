import { useEffect, useState } from 'preact/hooks'

// A tiny "the data changed" bus: screens re-read from the database when it fires.
const listeners = new Set<() => void>()

export function emitDataChanged(): void {
  listeners.forEach((l) => l())
}

/** A number that goes up whenever data changes; use it as a dependency to reload. */
export function useDataVersion(): number {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const listener = () => setVersion((v) => v + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return version
}
