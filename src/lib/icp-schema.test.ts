import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createICPResearchSchema } from './icp-schema'

const ORGANIZATION_TYPES = [
  'defi',
  'gaming',
  'social',
  'protocol',
  'infrastructure',
  'exchange',
  'investment',
  'service',
  'community',
  'nft',
] as const

describe('ICP research schema', () => {
  it.each(ORGANIZATION_TYPES)('keeps the %s schema within 64 root properties', orgType => {
    const schema = createICPResearchSchema(orgType) as z.ZodObject<z.ZodRawShape>
    expect(Object.keys(schema.shape).length).toBeLessThanOrEqual(64)
  })

  it('omits low-value fields from the universal research set', () => {
    const schema = createICPResearchSchema('nft') as z.ZodObject<z.ZodRawShape>
    const fields = Object.keys(schema.shape)

    expect(fields).not.toContain('medium')
    expect(fields).not.toContain('age_groups')
    expect(fields).not.toContain('interaction_preferences')
    expect(fields).not.toContain('sentiment_score')
    expect(fields).not.toContain('community_health_score')
  })
})
