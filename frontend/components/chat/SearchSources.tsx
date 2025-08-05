import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Globe, ExternalLink, Search } from 'lucide-react'

interface SearchSource {
  url: string
  title: string
  snippet: string
  domain?: string
  favicon?: string
}

interface SearchSourcesProps {
  sources: SearchSource[]
  searchQuery?: string
  isSearching?: boolean
  isCompact?: boolean
}

export default function SearchSources({ sources, searchQuery, isSearching = false, isCompact = false }: SearchSourcesProps) {
  const [isExpanded, setIsExpanded] = useState(!isCompact)

  if (sources.length === 0 && !isSearching) {
    return null
  }

  // In compact mode, show inline sources
  if (isCompact && !isExpanded) {
    return (
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[var(--nova-text-tertiary)]">Sources:</span>
        {sources.slice(0, 3).map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--nova-bg-tertiary)] hover:bg-[var(--nova-bg-hover)] text-xs text-[var(--nova-text-secondary)] transition-all group"
          >
            {source.favicon ? (
              <img src={source.favicon} alt="" className="h-3 w-3 rounded" />
            ) : (
              <Globe className="h-3 w-3 text-[var(--nova-text-tertiary)]" />
            )}
            <span className="max-w-[150px] truncate">{source.domain || new URL(source.url).hostname}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
        {sources.length > 3 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--nova-bg-tertiary)] hover:bg-[var(--nova-bg-hover)] text-xs text-[var(--nova-text-secondary)] transition-all"
          >
            <span>+{sources.length - 3} more</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-primary)] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--nova-bg-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#00BFFF]/10">
            <Search className="h-4 w-4 text-[#00BFFF]" />
          </div>
          <span className="text-sm font-medium text-[var(--nova-text-primary)]">
            {sources.length} Web {sources.length === 1 ? 'Source' : 'Sources'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-[var(--nova-text-tertiary)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--nova-text-tertiary)]" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--nova-border-primary)]">
          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg bg-[var(--nova-bg-secondary)] hover:bg-[var(--nova-bg-tertiary)] transition-all group border border-[var(--nova-border-secondary)] hover:border-[var(--nova-border-primary)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 p-2 rounded-lg bg-[var(--nova-bg-primary)]">
                    {source.favicon ? (
                      <img
                        src={source.favicon}
                        alt=""
                        className="h-4 w-4 rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <Globe className={`h-4 w-4 text-[var(--nova-text-tertiary)] ${source.favicon ? 'hidden' : ''}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-medium text-[var(--nova-text-primary)] line-clamp-1 group-hover:text-[var(--nova-primary)] transition-colors">
                        {source.title}
                      </h4>
                      <ExternalLink className="h-3 w-3 text-[var(--nova-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </div>
                    
                    <p className="text-xs text-[#00BFFF] mb-1.5">
                      {source.domain || new URL(source.url).hostname}
                    </p>
                    
                    {source.snippet && (
                      <p className="text-xs text-[var(--nova-text-tertiary)] line-clamp-2 leading-relaxed">
                        {source.snippet}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
          
          {isCompact && (
            <div className="px-4 py-2 border-t border-[var(--nova-border-primary)]">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-xs text-[var(--nova-text-tertiary)] hover:text-[var(--nova-text-secondary)] transition-colors"
              >
                Show less
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
