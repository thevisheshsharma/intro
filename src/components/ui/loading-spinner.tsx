'use client'

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-berri-raspberry/20 border-t-berri-raspberry ${sizeClasses[size]} ${className || ''}`}
    />
  )
}
