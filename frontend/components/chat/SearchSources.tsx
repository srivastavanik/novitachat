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

  // Always show the link preview cards style to match the reference image
  return (
    <div className="mt-3 mb-4">
      <div className="grid gap-2">
        {sources.slice(0, isExpanded ? sources.length : 3).map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-lg bg-[var(--nova-bg-secondary)] hover:bg-[var(--nova-bg-tertiary)] transition-all group border border-[var(--nova-border-secondary)] hover:border-[var(--nova-border-primary)]"
          >
            <div className="flex-shrink-0 mt-0.5">
              {source.favicon ? (
                <img
                  src={source.favicon}
                  alt=""
                  className="h-5 w-5 rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <Globe className={`h-5 w-5 text-[var(--nova-text-tertiary)] ${source.favicon ? 'hidden' : ''}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-[var(--nova-text-primary)] line-clamp-1 group-hover:text-[var(--nova-primary)] transition-colors">
                  {source.title}
                </h4>
                <ExternalLink className="h-3 w-3 text-[var(--nova-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </div>
              
              <p className="text-xs text-[#00BFFF] mt-0.5">
                {source.domain || new URL(source.url).hostname}
              </p>
              
              {source.snippet && (
                <p className="text-xs text-[var(--nova-text-tertiary)] line-clamp-2 mt-1">
                  {source.snippet}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
      
      {sources.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-[var(--nova-text-secondary)] hover:text-[var(--nova-text-primary)] transition-colors flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              Show less
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show {sources.length - 3} more
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
