import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { authService } from '../services/auth.service'
import { useWebSocket } from '../hooks/useWebSocket'
import ConversationList from '../components/chat/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import MessageInput from '../components/chat/MessageInput'
import SourcesPanel from '../components/chat/SourcesPanel'

export default function ChatPage() {
  const [mode, setMode] = useState<string>('search')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const logout = useAuthStore((s) => s.logout)

  // Targeted selectors — each only re-renders when its specific slice changes
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const addMessage = useChatStore((s) => s.addMessage)
  const pendingMessage = useChatStore((s) => s.pendingMessage)
  const setPendingMessage = useChatStore((s) => s.setPendingMessage)
  const activeTitle = useChatStore((s) => {
    if (!s.activeConversationId) return null
    return s.conversations.find((c) => c.id === s.activeConversationId)?.title ?? 'Chat'
  })
  const hasStreamingMessage = useChatStore((s) => {
    if (!s.activeConversationId) return false
    return (s.messages[s.activeConversationId] ?? []).some((m) => m.isStreaming)
  })

  const { send } = useWebSocket()

  // Flush a message that was queued before a conversation existed
  const pendingFlushedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activeConversationId || !pendingMessage) return
    // Avoid double-send if effect fires more than once for the same pending message
    const key = `${activeConversationId}:${pendingMessage.content}`
    if (pendingFlushedRef.current === key) return
    pendingFlushedRef.current = key

    addMessage(activeConversationId, {
      id: `local-${Date.now()}`,
      role: 'user',
      content: pendingMessage.content,
    })
    send({ type: 'chat', conversationId: activeConversationId, content: pendingMessage.content, mode: pendingMessage.mode })
    setPendingMessage(null)
  }, [activeConversationId, pendingMessage, addMessage, send, setPendingMessage])

  const handleNewChat = () => {
    send({ type: 'new_conversation' as const, mode })
  }

  const handleSend = (content: string) => {
    if (!activeConversationId) {
      setPendingMessage({ content, mode })
      send({ type: 'new_conversation', mode })
      return
    }

    addMessage(activeConversationId, {
      id: `local-${Date.now()}`,
      role: 'user',
      content,
    })

    send({ type: 'chat', conversationId: activeConversationId, content, mode })
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    }
    logout()
  }

  return (
    <div className="flex h-screen bg-brand-black overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          shrink-0 flex flex-col border-r border-brand-gray-dark
          transition-all duration-200
          ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gray-dark">
          <span className="text-brand-yellow font-black text-lg tracking-tight">RAG AI</span>
          <button
            onClick={handleLogout}
            className="text-[#555] hover:text-red-400 transition-colors"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        <ConversationList onNewChat={handleNewChat} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-brand-gray-dark">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[#555] hover:text-brand-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-[#555] text-xs truncate">
            {activeTitle ?? 'Select or start a conversation'}
          </span>
        </div>

        <ChatWindow />

        <MessageInput
          onSend={handleSend}
          disabled={hasStreamingMessage}
          mode={mode}
          onModeChange={setMode}
        />
      </div>

      <SourcesPanel />
    </div>
  )
}
