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
      <p className="text-lg font-medium text-red-600">{message}</p>
      {details && (
        <pre className="mt-2 max-w-full overflow-auto rounded bg-gray-800 p-4 text-sm text-gray-300">
          {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
        </pre>
      )}
      {retry && (
        <Button onClick={retry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  )
}
