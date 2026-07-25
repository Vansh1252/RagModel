import { create } from 'zustand'

export interface MessageSource {
  pineconeId: string
  file: string
  preview: string
  score: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: MessageSource[]
  feedback?: 1 | -1 | null
  isStreaming?: boolean
}

export interface Conversation {
  id: string
  title: string
  mode: 'search' | 'explain' | 'code' | 'creative'
  updatedAt: string
}

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, ChatMessage[]>
  sourcesPanel: { open: boolean; sources: MessageSource[] }
  pendingMessage: { content: string; mode: string } | null
  suggestions: string[]

  setConversations: (convs: Conversation[]) => void
  setPendingMessage: (msg: { content: string; mode: string } | null) => void
  addConversation: (conv: Conversation) => void
  setActiveConversation: (id: string) => void
  setMessages: (conversationId: string, msgs: ChatMessage[]) => void
  addMessage: (conversationId: string, msg: ChatMessage) => void
  appendStreamChunk: (conversationId: string, messageId: string, chunk: string) => void
  finalizeStreamMessage: (conversationId: string, messageId: string, dbMessageId: string, sources: MessageSource[]) => void
  setMessageFeedback: (conversationId: string, messageId: string, value: 1 | -1) => void
  openSourcesPanel: (sources: MessageSource[]) => void
  closeSourcesPanel: () => void
  cancelStreaming: (conversationId: string) => void
  removeConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
  setSuggestions: (s: string[]) => void
  clearSuggestions: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  sourcesPanel: { open: false, sources: [] },
  pendingMessage: null,
  suggestions: [],

  setConversations: (convs) => set({ conversations: convs }),
  setPendingMessage: (msg) => set({ pendingMessage: msg }),

  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: msgs } })),

  addMessage: (conversationId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), msg],
      },
    })),

  appendStreamChunk: (conversationId, messageId, chunk) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, content: m.content + chunk } : m
        ),
      },
    })),

  finalizeStreamMessage: (conversationId, messageId, dbMessageId, sources) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, id: dbMessageId, isStreaming: false, sources } : m
        ),
      },
    })),

  setMessageFeedback: (conversationId, messageId, value) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, feedback: value } : m
        ),
      },
    })),

  openSourcesPanel: (sources) =>
    set({ sourcesPanel: { open: true, sources } }),

  closeSourcesPanel: () =>
    set({ sourcesPanel: { open: false, sources: [] } }),

  cancelStreaming: (conversationId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m.isStreaming ? { ...m, isStreaming: false } : m
        ),
      },
    })),

  removeConversation: (id) =>
    set((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id)
      const activeConversationId = s.activeConversationId === id ? null : s.activeConversationId
      const messages = { ...s.messages }
      delete messages[id]
      return { conversations, activeConversationId, messages }
    }),

  renameConversation: (id, title) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    })),

  setSuggestions: (suggestions) => set({ suggestions }),
  clearSuggestions: () => set({ suggestions: [] }),
}))
