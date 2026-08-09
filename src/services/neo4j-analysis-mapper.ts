import { ICP_ANALYSIS_FIELDS, type ICPAnalysis } from '@/lib/icp-schema'
import { runQuery } from '@/lib/neo4j'

interface ClassificationData {
  orgType?: string
  orgSubtype?: string[]
  web3Focus?: string
}

function toNeo4jProperty(value: ICPAnalysis[keyof ICPAnalysis]): string | number | null {
  if (value === null || value === '') return null
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value)
  return value
}

/** Persists a complete canonical snapshot and removes stale analysis properties. */
export class Neo4jAnalysisMapper {
  static transformAnalysisForNeo4j(
    analysis: ICPAnalysis,
    classification?: ClassificationData
  ): Record<string, string | number | null> {
    const properties = Object.fromEntries(
      ICP_ANALYSIS_FIELDS.map(field => [field, toNeo4jProperty(analysis[field])])
    ) as Record<string, string | number | null>

    properties.last_icp_analysis = analysis.timestamp_utc
    if (classification?.orgType) properties.orgType = classification.orgType
    if (classification?.orgSubtype) properties.orgSubtype = JSON.stringify(classification.orgSubtype)
    if (classification?.web3Focus) properties.web3Focus = classification.web3Focus
    return properties
  }

  static async storeAnalysisToNeo4j(
    userId: string,
    analysis: ICPAnalysis,
    classification?: ClassificationData
  ): Promise<void> {
    const properties = this.transformAnalysisForNeo4j(analysis, classification)
    const result = await runQuery(`
      MATCH (u:User {userId: $userId})
      SET u += $properties
      RETURN u.userId AS userId
    `, { userId, properties })

    if (!result.length) throw new Error('Organization was not found while storing ICP analysis')
  }
}
