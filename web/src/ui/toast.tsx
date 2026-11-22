import { useEffect, useState } from 'preact/hooks'

interface ToastState {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

let current: ToastState | null = null
let counter = 0
let timer: ReturnType<typeof setTimeout> | undefined
const subscribers = new Set<() => void>()

function publish(next: ToastState | null): void {
  current = next
  subscribers.forEach((s) => s())
}

/** Shows a short message at the bottom, with an optional action such as Undo. */
export function showToast(message: string, actionLabel?: string, onAction?: () => void): void {
  clearTimeout(timer)
  publish({ id: ++counter, message, actionLabel, onAction })
  timer = setTimeout(() => publish(null), actionLabel ? 7000 : 2500)
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(current)
  useEffect(() => {
    const update = () => setToast(current)
    subscribers.add(update)
    return () => {
      subscribers.delete(update)
    }
  }, [])
  if (!toast) return null
  return (
    <div class="toast" role="status" key={toast.id}>
      <span>{toast.message}</span>
      {toast.actionLabel && toast.onAction ? (
        <button
          class="toast-action"
          onClick={() => {
            toast.onAction?.()
            publish(null)
          }}
        >
          {toast.actionLabel}
        </button>
      ) : null}
    </div>
  )
}
