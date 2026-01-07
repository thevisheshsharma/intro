import { memo, type FormEvent, forwardRef } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface SearchFormProps {
  value: string
  onChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  loading: boolean
}

// Refined search form - seamless shadow-based design, no border
const SearchForm = memo(forwardRef<HTMLInputElement, SearchFormProps>(
  function SearchForm({ value, onChange, onSubmit, loading }, ref) {
    return (
      <form onSubmit={onSubmit} className="w-full">
        <div className="flex items-center bg-white rounded-2xl 
                        shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)]
                        hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)]
                        focus-within:shadow-[0_4px_24px_-4px_rgba(229,72,104,0.15)]
                        transition-shadow duration-300">
          {/* Search icon */}
          <div className="pl-5">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>

          {/* Input */}
          <input
            ref={ref}
            type="text"
            placeholder="Search..."
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 px-4 py-4 text-gray-900 bg-transparent border-none
                       focus:outline-none focus:ring-0 text-[15px]
                       placeholder:text-gray-400"
            disabled={loading}
          />

          {/* Submit Button - Circular Raspberry Icon inside container */}
          <button
            type="submit"
            className="mr-2 w-11 h-11 rounded-full flex-shrink-0
                       bg-berri-raspberry/10 hover:bg-berri-raspberry
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-berri-raspberry hover:text-white
                       flex items-center justify-center 
                       transition-all duration-200"
            disabled={loading || !value.trim()}
          >
            {loading ? (
              <LoadingSpinner className="w-4 h-4" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    )
  }
))

export default SearchForm
