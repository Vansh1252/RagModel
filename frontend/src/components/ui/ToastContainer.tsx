import { useEffect } from 'react'
import { useToastStore } from '../../store/toastStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} message={toast.message} type={toast.type} onRemove={removeToast} />
      ))}
    </div>
  )
}

function ToastItem({
  id,
  message,
  type,
  onRemove,
}: {
  id: string
  message: string
  type: 'success' | 'error'
  onRemove: (id: string) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 4000)
    return () => clearTimeout(timer)
  }, [id, onRemove])

  return (
    <div
      className={`pointer-events-auto px-4 py-3 rounded-lg text-sm font-medium shadow-lg border max-w-sm ${
        type === 'success'
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}
    >
      {message}
    </div>
  )
}
