import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generateResearchedObject: vi.fn(),
  getOrganizationICPRelationships: vi.fn(),
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
  getOrganizationICPRelationships: mocks.getOrganizationICPRelationships,
  getOrganizationProperties: mocks.getOrganizationProperties,
  Neo4jAnalysisMapper: { storeAnalysisToNeo4j: mocks.storeAnalysisToNeo4j },
}))

import {
  ICPAnalysisSchema,
  ICP_CACHE_DAYS,
  createStructuredICPAnalysis,
  findOrgAffiliatesWithGrok,
} from './grok'

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
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrganizationICPRelationships.mockResolvedValue({
      partners: [],
      competitors: [],
      investors: [],
      auditors: [],
    })
  })

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
      xSearchAllowedHandles: ['alpha'],
      system: expect.stringContaining('latest available 2026 information'),
    }))
    const request = mocks.generateResearchedObject.mock.calls[0][0]
    expect(Object.keys(request.schema.shape)).toContain('throughput')
    expect(Object.keys(request.schema.shape)).not.toContain('floor_price')
    expect(mocks.storeAnalysisToNeo4j).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ twitter_username: 'alpha' }),
      { orgType: 'infrastructure' }
    )
  })

  it('can defer persistence so callers can validate and parallelize follow-up writes', async () => {
    mocks.getOrganizationProperties.mockResolvedValue({ userId: 'org-1', name: 'Alpha' })
    mocks.generateResearchedObject.mockResolvedValue(validAnalysis())

    const result = await createStructuredICPAnalysis(
      'Alpha',
      { orgType: 'infrastructure' },
      { persist: false }
    )

    expect(result.twitter_username).toBe('alpha')
    expect(mocks.storeAnalysisToNeo4j).not.toHaveBeenCalled()
  })

  it('expands a compact type-specific response into the complete canonical snapshot', async () => {
    mocks.getOrganizationProperties.mockResolvedValue({ userId: 'org-1' })
    mocks.generateResearchedObject.mockResolvedValue({
      name: 'Alpha',
      throughput: 'high',
    })

    const result = await createStructuredICPAnalysis(
      'Alpha',
      { orgType: 'infrastructure' },
      { persist: false }
    )

    expect(result).toMatchObject({
      twitter_username: 'alpha',
      name: 'Alpha',
      throughput: 'high',
      floor_price: null,
    })
  })

  it('passes organization identity, classification, and company relationships as context', async () => {
    mocks.getOrganizationProperties.mockResolvedValue({
      userId: 'org-1',
      screenName: 'Alpha',
      name: 'Alpha Network',
      description: 'Infrastructure network',
      orgType: 'infrastructure',
      orgSubtype: '["layer_1"]',
      web3Focus: 'native',
      partners: '["StoredPartner"]',
      competitors: '["StoredCompetitor"]',
      investors: '["StoredInvestor"]',
      auditor: '["StoredAuditor"]',
    })
    mocks.getOrganizationICPRelationships.mockResolvedValue({
      partners: ['GraphPartner'],
      competitors: ['GraphCompetitor'],
      investors: ['GraphInvestor'],
      auditors: ['GraphAuditor'],
    })
    mocks.generateResearchedObject.mockResolvedValue(validAnalysis())

    await createStructuredICPAnalysis(
      'Alpha',
      { orgType: 'infrastructure', orgSubtype: ['layer_1'], web3Focus: 'native' },
      { persist: false }
    )

    const { prompt } = mocks.generateResearchedObject.mock.calls[0][0]
    expect(prompt).toContain('"screenName":"Alpha"')
    expect(prompt).toContain('"orgType":"infrastructure"')
    expect(prompt).toContain('"partners":["StoredPartner","GraphPartner"]')
    expect(prompt).toContain('"competitors":["StoredCompetitor","GraphCompetitor"]')
    expect(prompt).toContain('"investors":["StoredInvestor","GraphInvestor"]')
    expect(prompt).toContain('"auditor":["StoredAuditor","GraphAuditor"]')
    expect(prompt).not.toContain('AFFILIATED_WITH')
    expect(prompt).not.toContain('WORKS_AT')
    expect(prompt).not.toContain('MEMBER_OF')
  })

  it('uses focused official-account X search for supplementary affiliate discovery', async () => {
    mocks.generateResearchedObject.mockResolvedValue({
      handles: [{ screenName: '@AlphaTeam', connection: 'team' }],
    })

    const result = await findOrgAffiliatesWithGrok('Alpha')

    expect(result).toEqual(['alphateam'])
    expect(mocks.generateResearchedObject).toHaveBeenCalledWith(expect.objectContaining({
      task: 'affiliateResearch',
      useWebSearch: false,
      xSearchAllowedHandles: ['alpha'],
    }))
  })
})
