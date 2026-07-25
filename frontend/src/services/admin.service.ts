import { api } from './api'

export interface Document {
  id: string
  name: string
  sourceType: string
  status: 'pending' | 'processing' | 'indexed' | 'failed'
  chunkCount: number | null
  error: string | null
  createdAt: string
}

export interface IngestTextPayload {
  title: string
  content: string
  sourceType?: 'txt' | 'md'
}

export interface IngestQAPayload {
  question: string
  answer: string
}

export interface FeedbackMessage {
  id: string
  conversationId: string
  role: string
  content: string
  feedback: 1 | -1
  createdAt: string
}

export interface AnalyticsData {
  total: number
  successful: number
  avgRetrievalMs: number
  avgLlmMs: number
  totalTokens: number
  byMode: Record<string, number>
  byIntent: Record<string, number>
  byDay: Record<string, number>
}

export const adminService = {
  async uploadFile(file: File): Promise<{ documentId: string; name: string; status: string }> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<{ documentId: string; name: string; status: string }>(
      '/api/admin/ingest/file',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async ingestText(
    payload: IngestTextPayload
  ): Promise<{ documentId: string; name: string; status: string }> {
    const { data } = await api.post<{ documentId: string; name: string; status: string }>(
      '/api/admin/ingest/text',
      payload
    )
    return data
  },

  async ingestQA(
    payload: IngestQAPayload
  ): Promise<{ documentId: string; name: string; status: string }> {
    const { data } = await api.post<{ documentId: string; name: string; status: string }>(
      '/api/admin/ingest/qa',
      payload
    )
    return data
  },

  async ingestUrl(payload: {
    url: string
    title?: string
  }): Promise<{ documentId: string; name: string; status: string }> {
    const { data } = await api.post<{ documentId: string; name: string; status: string }>(
      '/api/admin/ingest/url',
      payload
    )
    return data
  },

  async listDocuments(): Promise<Document[]> {
    const { data } = await api.get<Document[]>('/api/admin/documents')
    return data
  },

  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/api/admin/documents/${id}`)
  },

  async getFeedback(value?: 1 | -1): Promise<FeedbackMessage[]> {
    const params = value !== undefined ? `?value=${value}` : ''
    const { data } = await api.get<FeedbackMessage[]>(`/api/admin/feedback${params}`)
    return data
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const { data } = await api.get<AnalyticsData>('/api/admin/analytics')
    return data
  },
}
