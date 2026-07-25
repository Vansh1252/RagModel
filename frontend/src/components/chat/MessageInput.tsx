import { useState, useRef } from 'react'

interface Props {
  onSend: (content: string) => void
  onStop?: () => void
  disabled?: boolean
  mode: string
  onModeChange: (mode: string) => void
}

const MODES = [
  { value: 'search', label: 'Search', desc: 'Strict factual' },
  { value: 'explain', label: 'Explain', desc: 'Detailed' },
  { value: 'code', label: 'Code', desc: 'Dev-focused' },
  { value: 'creative', label: 'Creative', desc: 'Generative' },
]

export default function MessageInput({ onSend, onStop, disabled = false, mode, onModeChange }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="border-t border-[#2A2A2A] bg-[#0A0A0A] p-4">
      {/* Mode selector */}
      <div className="flex gap-1 mb-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              mode === m.value
                ? 'bg-[#FFD700] text-[#0A0A0A]'
                : 'bg-[#1A1A1A] text-[#666] hover:text-[#999] border border-[#2A2A2A]'
            }`}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
          className="
            flex-1 resize-none rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]
            text-[#F5F5F5] placeholder-[#555] text-sm
            px-4 py-3 leading-relaxed
            focus:outline-none focus:border-[#FFD700]
            disabled:opacity-50
            transition-colors
          "
          style={{ maxHeight: '160px' }}
        />

        {disabled ? (
          <button
            onClick={onStop}
            className="
              flex-shrink-0 w-10 h-10 rounded-xl
              bg-red-600 text-white
              flex items-center justify-center
              hover:bg-red-700 active:scale-95
              transition-all
            "
            title="Stop generation"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim() || disabled}
            className="
              flex-shrink-0 w-10 h-10 rounded-xl
              bg-[#FFD700] text-[#0A0A0A]
              flex items-center justify-center
              hover:bg-[#B8960C] active:scale-95
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-all
            "
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        )}
      </div>
      <p className="text-[#444] text-xs mt-2 text-center">
        Shift+Enter for new line
      </p>
    </div>
  )
}
