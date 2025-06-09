import { FormEvent } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface SearchFormProps {
  value: string
  onChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  loading: boolean
}

export default function SearchForm({ value, onChange, onSubmit, loading }: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="w-full flex flex-col items-center">
      <div className="flex w-full mb-4">
        <input
          type="text"
          placeholder="Type @username"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ backgroundColor: "#181818" }}
          className="flex-1 rounded-l-lg px-4 py-3 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
        />
        <button
          type="submit"
          className="rounded-r-lg px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-lg"
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner className="w-6 h-6" />
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}
