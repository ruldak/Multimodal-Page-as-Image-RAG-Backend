import { User, Sparkles, Clock, Zap } from 'lucide-react'
import type { Message } from '../../types'
import Citations from './Citations'
import { clsx } from 'clsx'

interface Props {
  message: Message
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  
  return (
    <div className={clsx('flex gap-4', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center',
        isUser
          ? 'bg-slate-200'
          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-slate-700" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>
      
      {/* Content */}
      <div className={clsx('flex-1 min-w-0', isUser && 'flex flex-col items-end')}>
        {!isUser && message.sources.length > 0 && (
          <Citations citations={message.sources} />
        )}
        
        <div className={clsx(
          'inline-block rounded-2xl p-4 shadow-sm max-w-full',
          isUser
            ? 'bg-slate-900 text-white rounded-tr-sm'
            : 'bg-white border border-slate-200 rounded-tl-sm'
        )}>
          <div className={clsx(
            'prose prose-sm max-w-none',
            isUser ? 'prose-invert' : 'text-slate-800'
          )}>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
        
        {/* Metadata */}
        {!isUser && message.model && (
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {message.model}
            </span>
            {message.latency_ms && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {(message.latency_ms / 1000).toFixed(2)}s
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}