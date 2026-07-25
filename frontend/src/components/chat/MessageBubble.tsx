import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../../services/api'
import { useChatStore, type ChatMessage, type MessageSource } from '../../store/chatStore'

interface Props {
  message: ChatMessage
  conversationId: string
}

export default function MessageBubble({ message, conversationId }: Props) {
  const { setMessageFeedback, openSourcesPanel } = useChatStore()
  const [copied, setCopied] = useState(false)

  const handleFeedback = async (value: 1 | -1) => {
    if (message.feedback) return
    setMessageFeedback(conversationId, message.id, value)
    try {
      await api.post('/api/feedback', { messageId: message.id, value })
    } catch {
      // ignore
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'max-w-[70%]' : 'max-w-[85%]'}`}>
        {/* Bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm
            ${isUser
              ? 'bg-[#FFD700] text-[#0A0A0A] rounded-tr-sm font-medium'
              : 'bg-[#1A1A1A] border border-[#2A2A2A] rounded-tl-sm'
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose text-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-[#FFD700] ml-0.5 animate-pulse rounded-sm" />
              )}
            </div>
          )}
        </div>

        {/* Sources + feedback for assistant */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-2 mt-1.5 ml-1">
            {/* Source chips */}
            {message.sources && message.sources.length > 0 && (
              <button
                onClick={() => openSourcesPanel(message.sources as MessageSource[])}
                className="flex items-center gap-1 text-xs text-[#666] hover:text-[#FFD700] transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
              </button>
            )}

            <div className="ml-auto flex gap-1">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-1 rounded transition-colors text-[#555] hover:text-[#999]"
                title={copied ? 'Copied!' : 'Copy response'}
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              {/* Thumbs up */}
              <button
                onClick={() => handleFeedback(1)}
                className={`p-1 rounded transition-colors ${
                  message.feedback === 1
                    ? 'text-[#FFD700]'
                    : 'text-[#555] hover:text-[#FFD700]'
                }`}
                title="Good answer"
              >
                <svg className="w-3.5 h-3.5" fill={message.feedback === 1 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>

              {/* Thumbs down */}
              <button
                onClick={() => handleFeedback(-1)}
                className={`p-1 rounded transition-colors ${
                  message.feedback === -1
                    ? 'text-red-400'
                    : 'text-[#555] hover:text-red-400'
                }`}
                title="Bad answer"
              >
                <svg className="w-3.5 h-3.5" fill={message.feedback === -1 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
