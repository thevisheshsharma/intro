'use client'

import { Button } from './button'

interface ErrorDisplayProps {
  message?: string
  details?: any
  retry?: () => void
  compact?: boolean
}

export function ErrorDisplay({
  message = 'Something went wrong',
  details,
  retry,
  compact = false
}: ErrorDisplayProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${compact ? 'py-4' : 'h-[60vh]'}`}>
      {/* Error icon */}
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>

      <p className="text-base font-medium text-gray-900">{message}</p>

      {details && (
        <pre className="mt-2 max-w-full overflow-auto rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600">
          {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
        </pre>
      )}

      {retry && (
        <Button onClick={retry} variant="outline" size="sm">
          Try Again
        </Button>
      )}
    </div>
  )
}
