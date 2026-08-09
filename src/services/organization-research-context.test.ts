import { describe, expect, it, vi } from 'vitest'

const { runQuery } = vi.hoisted(() => ({ runQuery: vi.fn() }))
vi.mock('@/lib/neo4j', () => ({ runQuery }))

import { getOrganizationICPRelationships } from './organization-research-context'

describe('getOrganizationICPRelationships', () => {
  it('returns only company-level ICP relationships', async () => {
    runQuery.mockResolvedValue([{
      partners: ['Partner'],
      competitors: ['Competitor'],
      investors: ['Investor'],
      auditors: ['Auditor'],
    }])

    await expect(getOrganizationICPRelationships('Alpha')).resolves.toEqual({
      partners: ['Partner'],
      competitors: ['Competitor'],
      investors: ['Investor'],
      auditors: ['Auditor'],
    })

    const [query, parameters] = runQuery.mock.calls[0]
    expect(query).toContain('PARTNERS_WITH')
    expect(query).toContain('COMPETES_WITH')
    expect(query).toContain('INVESTED_IN')
    expect(query).toContain('AUDITS')
    expect(query).not.toContain('WORKS_AT')
    expect(query).not.toContain('WORKED_AT')
    expect(query).not.toContain('MEMBER_OF')
    expect(query).not.toContain('AFFILIATED_WITH')
    expect(parameters).toEqual({ screenName: 'Alpha' })
  })

  it('returns empty relationship groups when the organization is absent', async () => {
    runQuery.mockResolvedValue([])

    await expect(getOrganizationICPRelationships('missing')).resolves.toEqual({
      partners: [],
      competitors: [],
      investors: [],
      auditors: [],
    })
  })
})
