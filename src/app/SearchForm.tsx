import { memo, type FormEvent } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ArrowRight } from 'lucide-react'

interface SearchFormProps {
  value: string
  onChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  loading: boolean
}

// Search form for Twitter username
const SearchForm = memo(function SearchForm({ value, onChange, onSubmit, loading }: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="w-full flex flex-col items-center">
      <div className="flex w-full mb-4">
        <input
          type="text"
          placeholder="Type @username"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 rounded-l-lg px-4 py-3 text-white border border-gray-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg 
                     bg-[#181818] placeholder-gray-400"
          disabled={loading}
        />
        <button
          type="submit"
          className="rounded-r-lg px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 
                     text-white flex items-center justify-center text-lg transition-colors"
          disabled={loading || !value.trim()}
        >
          {loading ? (
            <LoadingSpinner className="w-6 h-6" />
          ) : (
            <ArrowRight className="w-6 h-6" />
          )}
        </button>
      </div>
    </form>
  )
})

export default SearchForm
