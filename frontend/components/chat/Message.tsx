import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { User, FileText, Download, Search } from 'lucide-react'
import Image from 'next/image'
import SearchProgress from './SearchProgress'
import ThinkingDisplay from './ThinkingDisplay'
import LinkPreview from './LinkPreview'

interface MessageProps {
  message: {
    id: string
    content: string
    role: 'user' | 'assistant' | 'system'
    created_at: string
    user?: {
      username: string
    }
    metadata?: {
      webSearch?: boolean
      deepResearch?: boolean
      hasAttachments?: boolean
      attachmentCount?: number
      isSearchProgress?: boolean
      isThinking?: boolean
      isComplete?: boolean
      linkPreviews?: Array<{
        url: string
        title: string
        description?: string
        image?: string
      }>
    }
    attachments?: Array<{
      id: string
      filename: string
      mime_type: string
      size: number
      type: 'image' | 'document'
      url?: string
      data?: string
    }>
  }
  isStreaming?: boolean
}

export default function Message({ message, isStreaming = false }: MessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // System messages (search progress) have a different style
  if (isSystem && message.metadata?.isSearchProgress) {
    return <SearchProgress 
      content={message.content} 
      isActive={isStreaming && !message.metadata?.isComplete}
      autoMinimizeDelay={2000} // Auto-minimize after 2 seconds
    />
  }

  // Thinking messages
  if (isSystem && message.metadata?.isThinking) {
    return <ThinkingDisplay 
      content={message.content} 
      isActive={isStreaming && !message.metadata?.isComplete} 
    />
  }

  // Remove thinking tags from content if they exist
  const cleanContent = (content: string) => {
    // Remove <think> and </think> tags and everything between them
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  }

  return (
    <div className={`flex ${isUser ? 'justify-end pl-8' : 'justify-start pr-8'} px-4 py-2`}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm border border-white/10 p-2 mr-3">
          <Image 
            src="/novita-logo-only.png" 
            alt="Nova" 
            width={28} 
            height={28}
            className="object-contain"
          />
        </div>
      )}
      
      <div className={`${isUser ? 'max-w-[95%]' : 'max-w-[95%]'}`}>
        <div className={`space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2">
            {!isUser && (
              <span className="font-medium text-sm text-white/80">Nova</span>
            )}
            {!isStreaming && (
              <span className="text-xs text-white/40">
                {format(new Date(message.created_at), 'h:mm a')}
              </span>
            )}
            {isUser && message.metadata?.webSearch && (
              <span className="flex items-center gap-1 text-xs text-[#00BFFF]">
                <Search className="h-3 w-3" />
                Web Search
              </span>
            )}
            {isUser && message.metadata?.deepResearch && (
              <span className="flex items-center gap-1 text-xs text-[#00FF7F]">
                <Search className="h-3 w-3" />
                Deep Research
              </span>
            )}
          </div>
          
          <div className={`
            ${isUser 
              ? 'bg-gradient-to-r from-[#00FF7F]/20 to-[#00D96A]/20 border border-[#00FF7F]/30 px-4 py-3 rounded-2xl max-w-fit backdrop-blur-sm' 
              : 'bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-sm'
            }
          `}>
            <div className={`prose prose-sm max-w-none prose-invert ${
              isUser ? '' : ''
            }`}>
              {isUser ? (
                <p className="whitespace-pre-wrap m-0">{message.content}</p>
              ) : (
                <>
                  {isStreaming && !message.content ? (
                    <p className="m-0 text-white/60 italic">Nova is thinking...</p>
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({children}) => <p className="m-0 mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="m-0 mb-2 last:mb-0">{children}</ul>,
                        ol: ({children}) => <ol className="m-0 mb-2 last:mb-0">{children}</ol>,
                        h1: ({children}) => <h1 className="text-lg font-semibold m-0 mb-2">{children}</h1>,
                        h2: ({children}) => <h2 className="text-base font-semibold m-0 mb-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-semibold m-0 mb-2">{children}</h3>,
                        a: ({href, children}) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors duration-200 cursor-pointer"
                          >
                            {children}
                          </a>
                        ),
                        code: ({children, className}) => {
                          const isInline = !className || !className.includes('language-')
                          if (isInline) {
                            return <code className="bg-white/10 px-1 py-0.5 rounded text-[#00FF7F] text-sm">{children}</code>
                          }
                          return <code className="block overflow-x-auto">{children}</code>
                        },
                        pre: ({children}) => <pre className="bg-black/50 border border-white/10 p-4 rounded-lg overflow-x-auto">{children}</pre>
                      }}
                    >
                      {cleanContent(message.content)}
                    </ReactMarkdown>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Display attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm"
                >
                  {attachment.type === 'image' && attachment.data ? (
                    <div className="relative w-full max-w-sm">
                      <img
                        src={`data:${attachment.mime_type};base64,${attachment.data}`}
                        alt={attachment.filename}
                        className="rounded-lg w-full"
                      />
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                        {attachment.filename}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <FileText className="h-4 w-4 text-white/60" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{attachment.filename}</div>
                        <div className="text-xs text-white/40">
                          {formatFileSize(attachment.size)}
                        </div>
                      </div>
                      {attachment.data && (
                        <a
                          href={`data:${attachment.mime_type};base64,${attachment.data}`}
                          download={attachment.filename}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Download className="h-4 w-4 text-white/60 hover:text-white" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Display link previews */}
          {message.metadata?.linkPreviews && message.metadata.linkPreviews.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.metadata.linkPreviews.map((preview, index) => (
                <LinkPreview 
                  key={index} 
                  url={preview.url}
                  title={preview.title}
                  description={preview.description}
                  favicon={preview.image}
                />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
