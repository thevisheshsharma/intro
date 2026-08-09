import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireUserAccess: vi.fn(),
  parseJsonBody: vi.fn(),
  ensureUserExists: vi.fn(),
  getOrganizationProperties: vi.fn(),
  storeAnalysisToNeo4j: vi.fn(),
  processICPRelationships: vi.fn(),
  fetchTwitterProfile: vi.fn(),
  classifyOrganization: vi.fn(),
  createStructuredICPAnalysis: vi.fn(),
  waitUntil: vi.fn(),
}))

vi.mock('@vercel/functions', () => ({ waitUntil: mocks.waitUntil }))

vi.mock('@/lib/security/api-access', () => ({
  COST_BEARING_RATE_LIMITS: { companyIntel: {} },
  requireUserAccess: mocks.requireUserAccess,
}))
vi.mock('@/lib/security/request', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/security/request')>()
  return { ...actual, parseJsonBody: mocks.parseJsonBody }
})
vi.mock('@/lib/classifier', () => ({
  fetchTwitterProfile: mocks.fetchTwitterProfile,
  classifyOrganization: mocks.classifyOrganization,
}))
vi.mock('@/lib/grok', () => ({
  createStructuredICPAnalysis: mocks.createStructuredICPAnalysis,
}))
vi.mock('@/services', () => ({
  ensureUserExists: mocks.ensureUserExists,
  getOrganizationProperties: mocks.getOrganizationProperties,
  Neo4jAnalysisMapper: { storeAnalysisToNeo4j: mocks.storeAnalysisToNeo4j },
  processICPRelationships: mocks.processICPRelationships,
}))

import { POST } from './route'

const request = new Request('https://app.berri.example/api/grok-analyze-org', {
  method: 'POST',
})

describe('organization ICP route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireUserAccess.mockResolvedValue({ ok: true })
    mocks.parseJsonBody.mockResolvedValue({ twitterUsername: 'Alpha' })
    mocks.ensureUserExists.mockResolvedValue({ userId: 'org-1' })
    mocks.getOrganizationProperties.mockResolvedValue({
      orgType: 'infrastructure',
      orgSubtype: '["layer_1"]',
      web3Focus: 'web3_native',
      timestamp_utc: 'old',
    })
    mocks.fetchTwitterProfile.mockResolvedValue({ name: 'Alpha' })
    mocks.storeAnalysisToNeo4j.mockResolvedValue(undefined)
    mocks.processICPRelationships.mockResolvedValue(undefined)
  })

  it('uses fresh classification to select deferred-persistence ICP research', async () => {
    mocks.classifyOrganization.mockResolvedValue({
      vibe: 'organization',
      orgType: 'infrastructure',
      orgSubtype: ['layer_1'],
      web3Focus: 'web3_native',
    })
    mocks.createStructuredICPAnalysis.mockResolvedValue({
      twitter_username: 'alpha',
      timestamp_utc: 'new',
      competitors: ['beta'],
      investors: null,
      partners: null,
      auditor: null,
    })

    const response = await POST(request as never)
    expect(mocks.createStructuredICPAnalysis).toHaveBeenCalledWith(
      'alpha',
      {
        orgType: 'infrastructure',
        orgSubtype: ['layer_1'],
        web3Focus: 'web3_native',
      },
      { persist: false }
    )
    expect(response.status).toBe(200)
    expect(mocks.storeAnalysisToNeo4j).toHaveBeenCalledTimes(1)
    expect(mocks.processICPRelationships).toHaveBeenCalledTimes(1)
    expect(mocks.waitUntil).toHaveBeenCalledTimes(1)
  })

  it('does not persist research for an account rejected by classification', async () => {
    mocks.classifyOrganization.mockResolvedValue({ vibe: 'individual' })
    mocks.createStructuredICPAnalysis.mockResolvedValue({
      twitter_username: 'alpha',
      timestamp_utc: 'new',
    })

    const response = await POST(request as never)

    expect(response.status).toBe(400)
    expect(mocks.createStructuredICPAnalysis).not.toHaveBeenCalled()
    expect(mocks.storeAnalysisToNeo4j).not.toHaveBeenCalled()
    expect(mocks.processICPRelationships).not.toHaveBeenCalled()
    expect(mocks.waitUntil).not.toHaveBeenCalled()
  })

  it('overlaps research when the stored classification matches the current bio', async () => {
    let resolveClassification!: (value: unknown) => void
    mocks.getOrganizationProperties.mockResolvedValue({
      description: 'Current bio',
      orgType: 'infrastructure',
      orgSubtype: '["layer_1"]',
      web3Focus: 'web3_native',
      timestamp_utc: 'old',
    })
    mocks.fetchTwitterProfile.mockResolvedValue({ name: 'Alpha', description: 'Current bio' })
    mocks.classifyOrganization.mockReturnValue(new Promise(resolve => {
      resolveClassification = resolve
    }))
    mocks.createStructuredICPAnalysis.mockResolvedValue({
      twitter_username: 'alpha',
      timestamp_utc: 'new',
      competitors: null,
      investors: null,
      partners: null,
      auditor: null,
    })

    const responsePromise = POST(request as never)
    await vi.waitFor(() => {
      expect(mocks.createStructuredICPAnalysis).toHaveBeenCalledTimes(1)
    })

    resolveClassification({
      vibe: 'organization',
      orgType: 'infrastructure',
      orgSubtype: ['layer_1'],
      web3Focus: 'web3_native',
    })

    const response = await responsePromise
    expect(response.status).toBe(200)
  })
})
