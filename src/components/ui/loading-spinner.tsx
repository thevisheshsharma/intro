'use client'

interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className || 'h-12 w-12'}`} />
  )
}
