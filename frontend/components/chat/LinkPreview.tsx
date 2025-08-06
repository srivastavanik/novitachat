import React from 'react'
import { ExternalLink, Globe } from 'lucide-react'

interface LinkPreviewProps {
  url: string
  title?: string
  description?: string
  favicon?: string
}

export default function LinkPreview({ url, title, description, favicon }: LinkPreviewProps) {
  const domain = new URL(url).hostname.replace('www.', '')
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#00FF7F]/50 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded bg-white/10 flex items-center justify-center">
          {favicon ? (
            <img src={favicon} alt="" className="w-5 h-5" />
          ) : (
            <Globe className="w-4 h-4 text-white/60" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-white group-hover:text-[#00FF7F] transition-colors truncate">
            {title || domain}
          </h4>
          {description && (
            <p className="text-xs text-white/60 mt-1 line-clamp-2">
              {description}
            </p>
          )}
          <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{domain}</span>
          </div>
        </div>
      </div>
    </a>
  )
}
