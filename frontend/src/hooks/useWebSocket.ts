import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import type { MessageSource } from '../store/chatStore'

type WsOutMessage =
  | { type: 'auth'; token: string }
  | { type: 'new_conversation'; mode?: string }
  | { type: 'chat'; conversationId: string; content: string; mode?: string }
  | { type: 'feedback'; messageId: string; value: 1 | -1 }
  | { type: 'cancel' }

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Only subscribe to auth state — the WS handlers use getState() directly
  // to avoid stale closures and prevent the infinite-loop from unstable deps
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return
    if (ws.current?.readyState === WebSocket.OPEN) return

    const wsUrl = import.meta.env.VITE_WS_URL as string
    const socket = new WebSocket(`${wsUrl}/ws`)
    ws.current = socket

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'auth', token: accessToken }))
    }

    socket.onmessage = (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>
      } catch {
        return
      }

      // Use getState() directly — never close over hook values in async handlers
      const store = useChatStore.getState()

      switch (msg['type']) {
        case 'auth_ok':
          break

        case 'conversation_created':
          store.addConversation({
            id: msg['conversationId'] as string,
            title: msg['title'] as string,
            mode: (msg['mode'] as 'search') ?? 'search',
            updatedAt: new Date().toISOString(),
          })
          store.setActiveConversation(msg['conversationId'] as string)
          break

        case 'stream_start': {
          const convId = store.activeConversationId
          if (!convId) break
          store.addMessage(convId, {
            id: msg['messageId'] as string,
            role: 'assistant',
            content: '',
            isStreaming: true,
          })
          break
        }

        case 'stream_chunk': {
          const convId = store.activeConversationId
          if (!convId) break
          store.appendStreamChunk(
            convId,
            msg['messageId'] as string,
            msg['content'] as string
          )
          break
        }

        case 'stream_end': {
          const convId = store.activeConversationId
          if (!convId) break
          store.finalizeStreamMessage(
            convId,
            msg['messageId'] as string,
            (msg['dbMessageId'] as string) || (msg['messageId'] as string),
            (msg['sources'] as MessageSource[]) ?? []
          )
          break
        }

        case 'follow_up_suggestions': {
          store.setSuggestions(msg['suggestions'] as string[])
          break
        }

        case 'doc_indexed': {
          const authStore = useAuthStore.getState()
          if (authStore.role === 'admin') {
            useToastStore
              .getState()
              .addToast(
                `Document "${msg['name'] as string}" indexed (${msg['chunkCount'] as number} chunks)`,
                'success'
              )
          }
          break
        }

        case 'doc_failed': {
          const authStore = useAuthStore.getState()
          if (authStore.role === 'admin') {
            useToastStore
              .getState()
              .addToast(
                `Document "${msg['name'] as string}" failed: ${msg['error'] as string}`,
                'error'
              )
          }
          break
        }

        case 'error':
          console.error('[ws] Server error:', msg['message'])
          break
      }
    }

    socket.onclose = () => {
      ws.current = null
      reconnectTimer.current = setTimeout(() => {
        if (useAuthStore.getState().isAuthenticated) connect()
      }, 3000)
    }

    socket.onerror = () => {
      socket.close()
    }
  }, [isAuthenticated, accessToken]) // Only re-connect when auth changes

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
      ws.current = null
    }
  }, [connect])

  const send = useCallback((msg: WsOutMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg))
    }
  }, [])

  return { send }
}
