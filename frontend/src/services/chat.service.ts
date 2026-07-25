import { api } from './api'

export const chatService = {
  async deleteConversation(id: string): Promise<void> {
    await api.delete(`/api/chat/conversations/${id}`)
  },
  async renameConversation(id: string, title: string): Promise<void> {
    await api.patch(`/api/chat/conversations/${id}`, { title })
  },
}
