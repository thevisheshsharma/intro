import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generateClassification: vi.fn(),
  runQuery: vi.fn(),
  getUserByScreenName: vi.fn(),
  transformToNeo4jUser: vi.fn(),
  createOrUpdateUserWithScreenNameMerge: vi.fn(),
  processEmploymentData: vi.fn(),
}))

vi.mock('@/integrations/xai', () => ({
  generateClassification: mocks.generateClassification,
  XaiIntegrationError: class XaiIntegrationError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message)
      this.name = 'XaiIntegrationError'
    }
  },
}))

vi.mock('@/services', () => ({
  runQuery: mocks.runQuery,
  getUserByScreenName: mocks.getUserByScreenName,
  transformToNeo4jUser: mocks.transformToNeo4jUser,
  createOrUpdateUserWithScreenNameMerge: mocks.createOrUpdateUserWithScreenNameMerge,
  processEmploymentData: mocks.processEmploymentData,
}))

import {
  classifyProfileComplete,
  classifyProfilesWithGrok,
  extractMentionHandles,
  type TwitterProfile,
} from './classifier'
import { XaiIntegrationError } from '@/integrations/xai'

describe('Grok relationship classification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUserByScreenName.mockResolvedValue(null)
  })

  it('preserves many organizations and multiple relationship types for one pair', async () => {
    mocks.generateClassification.mockResolvedValue({
      results: [{
        screen_name: 'alice',
        vibe: 'individual',
        relationships: [
          { organizationHandle: '@alpha', type: 'WORKS_AT', kinds: null },
          { organizationHandle: 'beta', type: 'WORKS_AT', kinds: null },
          { organizationHandle: 'alpha', type: 'MEMBER_OF', kinds: ['advisor'] },
          { organizationHandle: 'alpha', type: 'MEMBER_OF', kinds: ['investor'] },
          { organizationHandle: 'gamma', type: 'MEMBER_OF', kinds: null },
        ],
        department: 'leadership',
      }],
    })

    const result = await classifyProfilesWithGrok({
      screen_name: 'Alice',
      name: 'Alice',
      description: 'Building @alpha and @beta; connected to @gamma',
    })

    expect(result).toMatchObject({
      screen_name: 'alice',
      current_organizations: ['@alpha', '@beta'],
      member_of: ['@alpha', '@gamma'],
    })
    expect(result.relationships).toContainEqual({
      organizationHandle: 'alpha',
      type: 'WORKS_AT',
    })
    expect(result.relationships).toContainEqual({
      organizationHandle: 'alpha',
      type: 'MEMBER_OF',
      kinds: ['advisor', 'investor'],
    })
    expect(result.relationships).toContainEqual({
      organizationHandle: 'gamma',
      type: 'MEMBER_OF',
      kinds: ['unknown'],
    })
  })

  it('maps batch results by handle when the provider reverses their order', async () => {
    mocks.generateClassification.mockResolvedValue({
      results: [
        { screen_name: 'second', vibe: 'individual', relationships: [], department: 'product' },
        { screen_name: 'first', vibe: 'individual', relationships: [], department: 'engineering' },
      ],
    })

    const result = await classifyProfilesWithGrok([
      { screen_name: 'first', name: 'First' },
      { screen_name: 'second', name: 'Second' },
    ])

    expect(result).toMatchObject([
      { screen_name: 'first', department: 'engineering' },
      { screen_name: 'second', department: 'product' },
    ])
  })

  it('passes xAI affiliate-discovery context into relationship classification', async () => {
    mocks.generateClassification.mockResolvedValue({
      results: [{
        screen_name: 'alice',
        vibe: 'individual',
        relationships: [{ organizationHandle: 'alpha', type: 'MEMBER_OF', kinds: ['unknown'] }],
      }],
    })

    await classifyProfilesWithGrok({
      screen_name: 'alice',
      name: 'Alice',
      candidate_organization: '@alpha',
    })

    expect(mocks.generateClassification).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('"candidate_organization":"alpha"'),
    }))
  })

  it('rejects an incomplete provider batch instead of fabricating results', async () => {
    mocks.generateClassification.mockResolvedValue({
      results: [{ screen_name: 'first', vibe: 'individual', relationships: [] }],
    })

    await expect(classifyProfilesWithGrok([
      { screen_name: 'first', name: 'First' },
      { screen_name: 'second', name: 'Second' },
    ])).rejects.toThrow('omitted')
  })

  it('splits a malformed provider batch and validates the smaller responses', async () => {
    mocks.generateClassification
      .mockRejectedValueOnce(new XaiIntegrationError('invalid_response', 'invalid'))
      .mockResolvedValueOnce({
        results: [{ screen_name: 'first', vibe: 'individual', relationships: [] }],
      })
      .mockResolvedValueOnce({
        results: [{ screen_name: 'second', vibe: 'individual', relationships: [] }],
      })

    const result = await classifyProfilesWithGrok([
      { screen_name: 'first', name: 'First' },
      { screen_name: 'second', name: 'Second' },
    ])

    expect(result.map(profile => profile.screen_name)).toEqual(['first', 'second'])
    expect(mocks.generateClassification).toHaveBeenCalledTimes(3)
  })

  it('does not write a fallback classification when xAI fails', async () => {
    mocks.generateClassification.mockRejectedValue(new Error('provider unavailable'))
    const profile: TwitterProfile = {
      id: '1',
      id_str: '1',
      screen_name: 'alice',
      name: 'Alice',
    }

    await expect(classifyProfileComplete('alice', profile)).rejects.toThrow('provider unavailable')
    expect(mocks.createOrUpdateUserWithScreenNameMerge).not.toHaveBeenCalled()
    expect(mocks.processEmploymentData).not.toHaveBeenCalled()
  })

  it('extracts each valid X mention without duplicates', () => {
    expect(extractMentionHandles('At @Alpha, advising @beta and @ALPHA.')).toEqual(['alpha', 'beta'])
  })
})
