import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { chatService } from '../../services/chat.service'
import { useChatStore, type Conversation } from '../../store/chatStore'

interface Props {
  readonly onNewChat: () => void
}

const MODE_LABELS: Record<string, string> = {
  search: 'S',
  explain: 'E',
  code: 'C',
  creative: 'CR',
}

const MODE_COLORS: Record<string, string> = {
  search: 'bg-blue-500',
  explain: 'bg-green-500',
  code: 'bg-purple-500',
  creative: 'bg-orange-500',
}

export default function ConversationList({ onNewChat }: Props) {
  const {
    conversations,
    activeConversationId,
    setConversations,
    setActiveConversation,
    setMessages,
    removeConversation,
    renameConversation,
  } = useChatStore()

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .get<Conversation[]>('/api/chat/conversations')
      .then((res) => setConversations(res.data))
      .catch(console.error)
  }, [setConversations])

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId) {
      setTimeout(() => renameInputRef.current?.focus(), 0)
    }
  }, [renamingId])

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpenId) return
    const handler = () => setMenuOpenId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpenId])

  const handleSelect = async (conv: Conversation) => {
    setActiveConversation(conv.id)
    try {
      const res = await api.get<
        Array<{
          id: string
          role: 'user' | 'assistant'
          content: string
          sources?: unknown
          feedback?: number
        }>
      >(`/api/chat/conversations/${conv.id}/messages`)
      setMessages(
        conv.id,
        res.data.map((m) => ({
          ...m,
          sources: (m.sources as never) ?? undefined,
          feedback: (m.feedback as 1 | -1 | null | undefined) ?? undefined,
        }))
      )
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    setMenuOpenId(null)
    try {
      await chatService.deleteConversation(id)
      removeConversation(id)
    } catch {
      // ignore
    }
  }

  const startRename = (conv: Conversation) => {
    setMenuOpenId(null)
    setRenamingId(conv.id)
    setRenameValue(conv.title)
  }

  const commitRename = async (id: string) => {
    const trimmed = renameValue.trim()
    if (trimmed) {
      try {
        await chatService.renameConversation(id, trimmed)
        renameConversation(id, trimmed)
      } catch {
        // ignore
      }
    }
    setRenamingId(null)
    setRenameValue('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#2A2A2A]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#FFD700] text-[#0A0A0A] font-semibold text-sm hover:bg-[#B8960C] transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {conversations.length === 0 && (
          <p className="text-[#666] text-xs text-center mt-6 px-4">
            No conversations yet. Start a new chat.
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`
              relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors group
              ${
                activeConversationId === conv.id
                  ? 'bg-[#2A2A2A] text-[#F5F5F5]'
                  : 'text-[#999] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]'
              }
            `}
          >
            <span
              className={`flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${MODE_COLORS[conv.mode] ?? 'bg-gray-500'}`}
            >
              {MODE_LABELS[conv.mode] ?? '?'}
            </span>

            {renamingId === conv.id ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitRename(conv.id)
                  if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                }}
                onBlur={() => void commitRename(conv.id)}
                className="flex-1 bg-[#2A2A2A] text-[#F5F5F5] text-sm rounded px-1 py-0.5 outline-none border border-[#FFD700]/50 min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="truncate flex-1 cursor-pointer"
                onClick={() => void handleSelect(conv)}
              >
                {conv.title}
              </span>
            )}

            {/* Three-dot menu button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
              }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#555] hover:text-[#999] p-0.5 rounded"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpenId === conv.id && (
              <div
                className="absolute right-1 top-full mt-1 z-50 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-lg overflow-hidden min-w-[120px]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => startRename(conv)}
                  className="w-full text-left px-4 py-2 text-sm text-[#999] hover:bg-[#2A2A2A] hover:text-white transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => void handleDelete(conv.id)}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#2A2A2A] transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
