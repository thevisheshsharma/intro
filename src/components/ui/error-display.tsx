'use client'

import { Button } from './button'

interface ErrorDisplayProps {
  message?: string
  retry?: () => void
}

export function ErrorDisplay({ message = 'Something went wrong', retry }: ErrorDisplayProps) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
      <p className="text-lg font-medium text-red-600">{message}</p>
      {retry && (
        <Button onClick={retry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  )
}
