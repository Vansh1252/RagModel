import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { adminService, type Document } from '../services/admin.service'

type Tab = 'upload' | 'text' | 'qa'

export default function AdminPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  const [tab, setTab] = useState<Tab>('upload')
  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // File upload state
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Text ingest state
  const [textForm, setTextForm] = useState({ title: '', content: '', sourceType: 'txt' as 'txt' | 'md' })
  const [textSubmitting, setTextSubmitting] = useState(false)

  // QA ingest state
  const [qaForm, setQaForm] = useState({ question: '', answer: '' })
  const [qaSubmitting, setQaSubmitting] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadDocs = async () => {
    try {
      const data = await adminService.listDocuments()
      setDocuments(data)
    } catch {
      // ignore
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => {
    void loadDocs()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      showToast('Please select a file first', false)
      return
    }

    setUploading(true)
    try {
      await adminService.uploadFile(selectedFile)
      showToast(`"${selectedFile.name}" queued for ingestion`)
      if (fileRef.current) fileRef.current.value = ''
      setSelectedFile(null)
      void loadDocs()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Upload failed'
      showToast(msg, false)
    } finally {
      setUploading(false)
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTextSubmitting(true)
    try {
      await adminService.ingestText(textForm)
      showToast(`"${textForm.title}" queued for ingestion`)
      setTextForm({ title: '', content: '', sourceType: 'txt' })
      void loadDocs()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Submission failed'
      showToast(msg, false)
    } finally {
      setTextSubmitting(false)
    }
  }

  const handleQASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setQaSubmitting(true)
    try {
      await adminService.ingestQA(qaForm)
      showToast('Q&A pair queued for ingestion')
      setQaForm({ question: '', answer: '' })
      void loadDocs()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Submission failed'
      showToast(msg, false)
    } finally {
      setQaSubmitting(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400',
    processing: 'text-blue-400',
    indexed: 'text-green-400',
    failed: 'text-red-400',
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#FFD700] font-black text-xl tracking-tight">RAG AI</span>
          <span className="text-[#444] text-xs">/ Admin</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-[#555] hover:text-red-400 text-sm transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg border ${
            toast.ok
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Ingest panel */}
        <section className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="flex border-b border-[#1A1A1A]">
            {(['upload', 'text', 'qa'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                    : 'text-[#555] hover:text-[#999]'
                }`}
              >
                {t === 'upload' ? 'Upload File' : t === 'text' ? 'Manual Text' : 'Q&A Pair'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* File Upload */}
            {tab === 'upload' && (
              <form onSubmit={handleFileUpload} className="flex flex-col gap-4">
                <p className="text-[#666] text-sm">
                  Upload PDF, TXT, MD, JSON, or code files. Max 50 MB.
                </p>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-brand-yellow/60 bg-brand-yellow/5'
                      : 'border-brand-gray-mid hover:border-brand-yellow/40'
                  }`}
                  onClick={() => fileRef.current?.click()}
                >
                  {selectedFile ? (
                    <>
                      <svg className="w-8 h-8 text-brand-yellow mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-brand-yellow font-medium truncate max-w-xs mx-auto">{selectedFile.name}</p>
                      <p className="text-xs text-[#555] mt-1">{(selectedFile.size / 1024).toFixed(1)} KB — click to change</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-[#444] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-[#555]">Click to select file</p>
                      <p className="text-xs text-[#444] mt-1">PDF, TXT, MD, JSON, TS, JS, PY — max 50 MB</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.md,.json,.ts,.js,.py"
                    onChange={handleFileSelect}
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="self-start bg-[#FFD700] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-lg px-5 py-2 text-sm transition-colors"
                >
                  {uploading ? 'Uploading…' : 'Upload & Ingest'}
                </button>
              </form>
            )}

            {/* Manual Text */}
            {tab === 'text' && (
              <form onSubmit={handleTextSubmit} className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#999] uppercase tracking-wider">Title</label>
                    <input
                      type="text"
                      placeholder="Document title"
                      value={textForm.title}
                      onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
                      required
                      className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#FFD700]/50 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#999] uppercase tracking-wider">Format</label>
                    <select
                      value={textForm.sourceType}
                      onChange={(e) => setTextForm({ ...textForm, sourceType: e.target.value as 'txt' | 'md' })}
                      className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors"
                    >
                      <option value="txt">Plain text</option>
                      <option value="md">Markdown</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#999] uppercase tracking-wider">Content</label>
                  <textarea
                    placeholder="Paste or type the document content here…"
                    value={textForm.content}
                    onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                    required
                    rows={10}
                    className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#FFD700]/50 transition-colors resize-y"
                  />
                </div>
                <button
                  type="submit"
                  disabled={textSubmitting}
                  className="self-start bg-[#FFD700] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-lg px-5 py-2 text-sm transition-colors"
                >
                  {textSubmitting ? 'Submitting…' : 'Ingest Text'}
                </button>
              </form>
            )}

            {/* Q&A Pair */}
            {tab === 'qa' && (
              <form onSubmit={handleQASubmit} className="flex flex-col gap-4">
                <p className="text-[#666] text-sm">
                  Add a Q&amp;A pair directly into the knowledge base.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#999] uppercase tracking-wider">Question</label>
                  <input
                    type="text"
                    placeholder="What is…?"
                    value={qaForm.question}
                    onChange={(e) => setQaForm({ ...qaForm, question: e.target.value })}
                    required
                    className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#FFD700]/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#999] uppercase tracking-wider">Answer</label>
                  <textarea
                    placeholder="The answer is…"
                    value={qaForm.answer}
                    onChange={(e) => setQaForm({ ...qaForm, answer: e.target.value })}
                    required
                    rows={6}
                    className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#FFD700]/50 transition-colors resize-y"
                  />
                </div>
                <button
                  type="submit"
                  disabled={qaSubmitting}
                  className="self-start bg-[#FFD700] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-lg px-5 py-2 text-sm transition-colors"
                >
                  {qaSubmitting ? 'Submitting…' : 'Add Q&A Pair'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Documents table */}
        <section className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1A1A1A]">
            <h2 className="text-sm font-semibold text-[#999]">Ingested Documents</h2>
            <button
              onClick={() => void loadDocs()}
              className="text-xs text-[#555] hover:text-[#FFD700] transition-colors"
            >
              Refresh
            </button>
          </div>

          {docsLoading ? (
            <div className="p-8 text-center text-[#444] text-sm">Loading…</div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-[#444] text-sm">No documents yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1A1A1A]">
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#555] uppercase tracking-wider">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#555] uppercase tracking-wider">Type</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#555] uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-[#555] uppercase tracking-wider">Chunks</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#555] uppercase tracking-wider">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-[#161616] hover:bg-[#141414] transition-colors">
                      <td className="px-5 py-3 text-white truncate max-w-xs" title={doc.name}>
                        {doc.name}
                        {doc.error && (
                          <span className="ml-2 text-xs text-red-400" title={doc.error}>
                            (error)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#666] uppercase text-xs">{doc.sourceType}</td>
                      <td className={`px-5 py-3 font-medium capitalize ${statusColor[doc.status] ?? 'text-[#666]'}`}>
                        {doc.status}
                      </td>
                      <td className="px-5 py-3 text-right text-[#666]">{doc.chunkCount ?? '—'}</td>
                      <td className="px-5 py-3 text-[#555] text-xs">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
