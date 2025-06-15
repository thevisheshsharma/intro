import React, { useState } from 'react'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import type { OrganizationICP } from '@/lib/organization'

interface ICPEditFormProps {
  icp: OrganizationICP
  onSave: (updatedICP: Partial<OrganizationICP>) => void
  onCancel: () => void
  loading?: boolean
}

export function ICPEditForm({ icp, onSave, onCancel, loading = false }: ICPEditFormProps) {
  const [formData, setFormData] = useState({
    target_industry: icp.target_industry || '',
    target_role: icp.target_role || '',
    company_size: icp.company_size || '',
    geographic_location: icp.geographic_location || '',
    pain_points: icp.pain_points || [],
    keywords: icp.keywords || [],
    demographics: {
      age_range: icp.demographics?.age_range || '',
      education_level: icp.demographics?.education_level || '',
      income_level: icp.demographics?.income_level || '',
      job_seniority: icp.demographics?.job_seniority || ''
    },
    custom_notes: icp.custom_notes || ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDemographicsChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      demographics: {
        ...prev.demographics,
        [field]: value
      }
    }))
  }

  const handleArrayAdd = (field: 'pain_points' | 'keywords', value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }))
    }
  }

  const handleArrayRemove = (field: 'pain_points' | 'keywords', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      target_industry: formData.target_industry,
      target_role: formData.target_role,
      company_size: formData.company_size,
      geographic_location: formData.geographic_location,
      pain_points: formData.pain_points,
      keywords: formData.keywords,
      demographics: formData.demographics,
      custom_notes: formData.custom_notes,
      is_custom: true
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Edit ICP</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic ICP Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Industry
              </label>
              <input
                type="text"
                value={formData.target_industry}
                onChange={(e) => handleInputChange('target_industry', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., SaaS, E-commerce, Healthcare"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Role
              </label>
              <input
                type="text"
                value={formData.target_role}
                onChange={(e) => handleInputChange('target_role', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Marketing Manager, CTO, Founder"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Size
              </label>
              <select
                value={formData.company_size}
                onChange={(e) => handleInputChange('company_size', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select company size</option>
                <option value="Startup (1-10)">Startup (1-10)</option>
                <option value="Small (11-50)">Small (11-50)</option>
                <option value="Medium (51-200)">Medium (51-200)</option>
                <option value="Large (201-1000)">Large (201-1000)</option>
                <option value="Enterprise (1000+)">Enterprise (1000+)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Geographic Location
              </label>
              <input
                type="text"
                value={formData.geographic_location}
                onChange={(e) => handleInputChange('geographic_location', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., North America, Europe, Global"
              />
            </div>
          </div>

          {/* Demographics */}
          <div>
            <h4 className="text-lg font-medium text-white mb-3">Demographics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Age Range
                </label>
                <input
                  type="text"
                  value={formData.demographics.age_range}
                  onChange={(e) => handleDemographicsChange('age_range', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 25-45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Education Level
                </label>
                <input
                  type="text"
                  value={formData.demographics.education_level}
                  onChange={(e) => handleDemographicsChange('education_level', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Bachelor's degree or higher"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Income Level
                </label>
                <input
                  type="text"
                  value={formData.demographics.income_level}
                  onChange={(e) => handleDemographicsChange('income_level', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., $50k-$150k"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Seniority
                </label>
                <select
                  value={formData.demographics.job_seniority}
                  onChange={(e) => handleDemographicsChange('job_seniority', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select seniority level</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid-level">Mid-level</option>
                  <option value="Senior">Senior</option>
                  <option value="Executive">Executive</option>
                  <option value="C-level">C-level</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pain Points */}
          <ArrayFieldEditor
            label="Pain Points"
            items={formData.pain_points}
            onAdd={(value) => handleArrayAdd('pain_points', value)}
            onRemove={(index) => handleArrayRemove('pain_points', index)}
            placeholder="Add a pain point your organization solves"
          />

          {/* Keywords */}
          <ArrayFieldEditor
            label="Keywords"
            items={formData.keywords}
            onAdd={(value) => handleArrayAdd('keywords', value)}
            onRemove={(index) => handleArrayRemove('keywords', index)}
            placeholder="Add relevant targeting keywords"
          />

          {/* Custom Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Notes
            </label>
            <textarea
              value={formData.custom_notes}
              onChange={(e) => handleInputChange('custom_notes', e.target.value)}
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Add any custom notes or additional insights about your ICP..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-600">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ArrayFieldEditorProps {
  label: string
  items: string[]
  onAdd: (value: string) => void
  onRemove: (index: number) => void
  placeholder: string
}

function ArrayFieldEditor({ label, items, onAdd, onRemove, placeholder }: ArrayFieldEditorProps) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
              <span className="flex-1 text-white text-sm">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
