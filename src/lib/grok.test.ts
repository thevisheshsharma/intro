import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generateResearchedObject: vi.fn(),
  getOrganizationProperties: vi.fn(),
  storeAnalysisToNeo4j: vi.fn(),
}))

vi.mock('@/integrations/xai', () => ({
  XAI_MODELS: {
    classification: 'grok-4.5',
    affiliateResearch: 'grok-4.5',
    icpResearch: 'grok-4.5',
  },
  generateResearchedObject: mocks.generateResearchedObject,
}))

vi.mock('@/services', () => ({
  getOrganizationProperties: mocks.getOrganizationProperties,
  Neo4jAnalysisMapper: { storeAnalysisToNeo4j: mocks.storeAnalysisToNeo4j },
}))

import { ICPAnalysisSchema, ICP_CACHE_DAYS, createStructuredICPAnalysis } from './grok'

function validAnalysis() {
  const values = Object.fromEntries(Object.keys(ICPAnalysisSchema.shape).map(key => [key, null]))
  return ICPAnalysisSchema.parse({
    ...values,
    twitter_username: 'alpha',
    timestamp_utc: '2026-08-10T00:00:00.000Z',
    name: 'Alpha',
    industry: 'Infrastructure',
    user_archetypes: [],
  })
}

describe('structured ICP research', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses a 60-day cache', () => {
    expect(ICP_CACHE_DAYS).toBe(60)
  })

  it('requests grounded 2026 X and web research and stores the canonical result', async () => {
    mocks.getOrganizationProperties.mockResolvedValue({ userId: 'org-1', name: 'Alpha' })
    mocks.generateResearchedObject.mockResolvedValue(validAnalysis())

    const result = await createStructuredICPAnalysis('Alpha', { orgType: 'infrastructure' })

    expect(result.twitter_username).toBe('alpha')
    expect(mocks.generateResearchedObject).toHaveBeenCalledWith(expect.objectContaining({
      task: 'icpResearch',
      xSearchFromDate: '2026-01-01',
      system: expect.stringContaining('latest available 2026 information'),
    }))
    expect(mocks.storeAnalysisToNeo4j).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ twitter_username: 'alpha' }),
      { orgType: 'infrastructure' }
    )
  })
})
