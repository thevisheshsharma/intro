import { describe, expect, it, vi } from 'vitest'

const { runQuery } = vi.hoisted(() => ({ runQuery: vi.fn() }))
vi.mock('@/lib/neo4j', () => ({ runQuery }))

import { ICPAnalysisSchema } from '@/lib/icp-schema'
import { Neo4jAnalysisMapper } from './neo4j-analysis-mapper'

function validAnalysis() {
  const values = Object.fromEntries(Object.keys(ICPAnalysisSchema.shape).map(key => [key, null]))
  return ICPAnalysisSchema.parse({
    ...values,
    twitter_username: 'alpha',
    timestamp_utc: '2026-08-10T00:00:00.000Z',
    name: 'Alpha',
    industry: 'Infrastructure',
    user_archetypes: [],
    key_features: ['Fast'],
  })
}

describe('Neo4jAnalysisMapper', () => {
  it('creates a complete replace map including nulls that clear stale values', () => {
    const properties = Neo4jAnalysisMapper.transformAnalysisForNeo4j(validAnalysis())

    expect(properties.twitter_username).toBe('alpha')
    expect(properties.timestamp_utc).toBe('2026-08-10T00:00:00.000Z')
    expect(properties.key_features).toBe('["Fast"]')
    expect(properties.competitors).toBeNull()
    expect(properties.last_icp_analysis).toBe('2026-08-10T00:00:00.000Z')
  })

  it('writes the complete map with a parameterized map update', async () => {
    runQuery.mockResolvedValue([{ userId: 'org-1' }])
    await Neo4jAnalysisMapper.storeAnalysisToNeo4j('org-1', validAnalysis())

    expect(runQuery).toHaveBeenCalledWith(
      expect.stringContaining('SET u += $properties'),
      expect.objectContaining({ userId: 'org-1' })
    )
  })
})
