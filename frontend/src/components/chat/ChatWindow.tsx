import { useEffect, useRef } from 'react'
import { useChatStore, type ChatMessage } from '../../store/chatStore'
import MessageBubble from './MessageBubble'

// Stable constant — same reference every call, prevents "getSnapshot should be cached" loop
const EMPTY_MESSAGES: ChatMessage[] = []
const EMPTY_SUGGESTIONS: string[] = []

interface Props {
  onSuggestionClick?: (suggestion: string) => void
}

export default function ChatWindow({ onSuggestionClick }: Props) {
  // Two separate selectors — each returns a primitive or a stable store reference.
  // Never return a new object/array literal from a selector — it breaks useSyncExternalStore.
  const activeConversationId = useChatStore((s) => s.activeConversationId)

  // Uses s.activeConversationId from store directly (not closure) so it's always fresh.
  // ?? EMPTY_MESSAGES ensures a stable reference when the key is missing.
  const messages = useChatStore((s) =>
    s.activeConversationId
      ? (s.messages[s.activeConversationId] ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES
  )

  const suggestions = useChatStore((s) =>
    s.suggestions.length > 0 ? s.suggestions : EMPTY_SUGGESTIONS
  )

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="text-6xl font-black text-[#FFD700]/20">RAG AI</div>
        <p className="text-[#555] text-sm max-w-xs">
          Start a new chat or select a conversation from the sidebar to begin.
        </p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
        <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#FFD700]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p className="text-[#555] text-sm">Ask your first question below.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            conversationId={activeConversationId}
          />
        ))}

        {/* Follow-up suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick?.(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-[#999] hover:text-[#F5F5F5] hover:border-[#FFD700]/40 transition-colors whitespace-nowrap"
              >
                <span>→</span>
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
