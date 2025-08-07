import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { format } from 'date-fns'
import Image from 'next/image'
import SearchProgress from './SearchProgress'
import ThinkingDisplay from './ThinkingDisplay'
import LinkPreview from './LinkPreview'
import SearchSources from './SearchSources'

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
      searchSources?: Array<{
        url: string
        title: string
        snippet: string
        domain?: string
        favicon?: string
      }>
      thinkingTime?: number
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
    <div className={`flex ${isUser ? 'justify-end pl-2 md:pl-8' : 'justify-start pr-2 md:pr-8'} px-2 md:px-4 ${isUser ? 'py-2 md:py-3' : 'py-4 md:py-6'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-gray-900 dark:bg-[var(--nova-bg-tertiary)] mr-2 md:mr-3">
          <Image 
            src="/novita-logo-only.png" 
            alt="Chat" 
            width={24} 
            height={24}
            className="object-contain md:w-7 md:h-7"
          />
        </div>
      )}
      
      <div className={`${isUser ? 'max-w-[85%] md:max-w-[95%]' : 'max-w-[85%] md:max-w-[95%]'}`}>
        <div className={`space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Display search sources before the message if this is an assistant message with search results */}
          {!isUser && message.metadata?.searchSources && message.metadata.searchSources.length > 0 && (
            <SearchSources 
              sources={message.metadata.searchSources}
              isCompact={true}
            />
          )}
          
          <div className="flex items-center gap-2">
            {!isUser && (
              <span className="font-medium text-sm text-[var(--nova-text-primary)]">Chat</span>
            )}
            {!isStreaming && (
              <span className="text-xs text-[var(--nova-text-tertiary)]">
                {format(new Date(message.created_at), 'h:mm a')}
              </span>
            )}
            {isUser && message.metadata?.webSearch && (
              <span className="text-xs text-[#00BFFF]">
                Web Search
              </span>
            )}
            {isUser && message.metadata?.deepResearch && (
              <span className="text-xs text-[#00FF7F]">
                Deep Research
              </span>
            )}
          </div>
          
          <div className={`
            ${isUser 
              ? 'bg-[var(--nova-bg-hover)] px-4 py-3 rounded-2xl max-w-fit' 
              : 'px-4 py-3'
            }
          `}>
            <div className={`prose prose-lg max-w-none prose-invert ${
              isUser ? '' : 'font-[var(--nova-font-sans)] leading-relaxed'
            } ${!isUser ? 'space-y-4' : ''}`}>
              {isUser ? (
                <p className="whitespace-pre-wrap m-0">{message.content}</p>
              ) : (
                <>
                  {isStreaming && !message.content ? (
                    <p className="m-0 text-gray-400 italic">Chat is thinking...</p>
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({children}) => <p className={`m-0 ${isUser ? 'mb-2' : 'mb-4'} last:mb-0 text-[var(--nova-text-primary)]`}>{children}</p>,
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
                            return <code className="bg-[var(--nova-bg-primary)] px-1 py-0.5 rounded text-[var(--nova-primary)] text-sm">{children}</code>
                          }
                          return <code className="block overflow-x-auto">{children}</code>
                        },
                        pre: ({children}) => <pre className="bg-[var(--nova-bg-primary)] border border-[var(--nova-border-primary)] p-4 rounded-lg overflow-x-auto">{children}</pre>
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
                  className="flex items-center gap-2 p-2 rounded-lg bg-[var(--nova-bg-tertiary)] border border-[var(--nova-border-primary)]"
                >
                  {attachment.type === 'image' && attachment.data ? (
                    <div className="relative w-full max-w-sm">
                      <img
                        src={`data:${attachment.mime_type};base64,${attachment.data}`}
                        alt={attachment.filename}
                        className="rounded-lg w-full"
                      />
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-[var(--nova-bg-primary)]/70 rounded text-xs text-[var(--nova-text-primary)]">
                        {attachment.filename}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[var(--nova-text-primary)]">{attachment.filename}</div>
                        <div className="text-xs text-[var(--nova-text-tertiary)]">
                          {formatFileSize(attachment.size)}
                        </div>
                      </div>
                      {attachment.data && (
                        <a
                          href={`data:${attachment.mime_type};base64,${attachment.data}`}
                          download={attachment.filename}
                          className="px-2 py-1 text-xs bg-[var(--nova-bg-hover)] hover:bg-[var(--nova-bg-tertiary)] rounded transition-colors text-[var(--nova-text-secondary)]"
                        >
                          Download
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
