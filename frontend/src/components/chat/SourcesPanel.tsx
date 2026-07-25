import { useChatStore, type MessageSource } from '../../store/chatStore'

export default function SourcesPanel() {
  const { sourcesPanel, closeSourcesPanel } = useChatStore()
  const { open, sources } = sourcesPanel

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={closeSourcesPanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-[#1A1A1A] border-l border-[#2A2A2A] z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h2 className="text-sm font-semibold text-[#FFD700]">Sources</h2>
          <button
            onClick={closeSourcesPanel}
            className="text-[#666] hover:text-[#F5F5F5] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {sources.map((source: MessageSource, i: number) => (
            <div key={source.pineconeId} className="bg-[#2A2A2A] rounded-lg p-3 border border-[#3A3A3A]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded">
                    [{i + 1}]
                  </span>
                  <span className="text-xs text-[#F5F5F5] font-medium truncate max-w-[160px]">
                    {source.file}
                  </span>
                </div>
                <span className="text-xs text-[#666] flex-shrink-0">
                  {(source.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-[#999] leading-relaxed line-clamp-4">
                {source.preview}
              </p>
            </div>
          ))}

          {sources.length === 0 && (
            <p className="text-[#666] text-xs text-center mt-8">No sources for this message.</p>
          )}
        </div>
      </div>
    </>
  )
}
