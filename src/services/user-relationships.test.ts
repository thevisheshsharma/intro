import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runQuery: vi.fn(),
  runBatchQuery: vi.fn(),
  runQueryWithoutRetry: vi.fn(),
}))

vi.mock('@/lib/neo4j', () => mocks)
vi.mock('@/lib/socialapi-pagination', () => ({ fetchUserFromSocialAPI: vi.fn() }))

import {
  addMemberOfRelationships,
  extractOrganizationData,
  processEmploymentData,
} from './user'

describe('organization relationship persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.runQuery.mockResolvedValue([])
  })

  it('keeps separate WORKS_AT and MEMBER_OF relationships to the same organization', () => {
    const extracted = extractOrganizationData([{
      screen_name: 'alice',
      _employment_data: {
        complete_snapshot: true,
        current_organizations: ['@alpha', '@beta'],
        past_organizations: [],
        member_of: ['@alpha'],
        member_of_details: [{
          screen_name: '@alpha',
          kinds: ['advisor', 'investor'],
          source: 'x_bio',
          observedAt: '2026-08-10T00:00:00.000Z',
          status: 'inferred',
        }],
      },
    }])

    expect(extracted.worksAtRelationships.map(rel => rel.orgScreenName)).toEqual(['alpha', 'beta'])
    expect(extracted.memberOfRelationships).toContainEqual(expect.objectContaining({
      orgScreenName: 'alpha',
      kinds: ['advisor', 'investor'],
    }))
    expect(extracted.reconciliationProfiles[0]).toEqual({
      userScreenName: 'alice',
      worksAt: ['alpha', 'beta'],
      workedAt: [],
      memberOf: ['alpha'],
    })
  })

  it('merges MEMBER_OF kinds without merging away the relationship type', async () => {
    mocks.runQuery.mockResolvedValue([{ userScreenName: 'alice', orgScreenName: 'alpha' }])

    await addMemberOfRelationships([
      { userScreenName: 'alice', orgScreenName: 'alpha', kinds: ['advisor'] },
      { userScreenName: 'alice', orgScreenName: 'alpha', kinds: ['investor'] },
    ])

    const [query, parameters] = mocks.runQuery.mock.calls[0]
    expect(query).toContain('MERGE (u)-[r:MEMBER_OF]->(o)')
    expect(query).toContain('reduce(acc = coalesce(r.kinds, [])')
    expect(parameters.relationships).toEqual([
      expect.objectContaining({ kinds: ['advisor', 'investor'] }),
    ])
  })

  it('reconciles empty complete snapshots without mentioning AFFILIATED_WITH', async () => {
    await processEmploymentData([{
      screen_name: 'alice',
      _employment_data: {
        complete_snapshot: true,
        current_organizations: [],
        past_organizations: [],
        member_of: [],
      },
    }])

    const reconciliationQuery = mocks.runQuery.mock.calls[0][0] as string
    expect(reconciliationQuery).toContain('WORKS_AT|WORKED_AT|MEMBER_OF')
    expect(reconciliationQuery).not.toContain('AFFILIATED_WITH')
  })
})
