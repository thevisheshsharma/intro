import { runQuery } from '@/lib/neo4j'

export interface OrganizationICPRelationships {
  partners: string[]
  competitors: string[]
  investors: string[]
  auditors: string[]
}

const EMPTY_RELATIONSHIPS: OrganizationICPRelationships = {
  partners: [],
  competitors: [],
  investors: [],
  auditors: [],
}

/** Returns only organization-level relationships used as company ICP context. */
export async function getOrganizationICPRelationships(
  screenName: string
): Promise<OrganizationICPRelationships> {
  const results = await runQuery<OrganizationICPRelationships>(`
    MATCH (org:User)
    WHERE toLower(org.screenName) = toLower($screenName)

    OPTIONAL MATCH (org)-[:PARTNERS_WITH]-(partner:User)
    WITH org,
         [handle IN collect(DISTINCT partner.screenName) WHERE handle IS NOT NULL] AS partners

    OPTIONAL MATCH (org)-[:COMPETES_WITH]-(competitor:User)
    WITH org, partners,
         [handle IN collect(DISTINCT competitor.screenName) WHERE handle IS NOT NULL] AS competitors

    OPTIONAL MATCH (investor:User)-[:INVESTED_IN]->(org)
    WITH org, partners, competitors,
         [handle IN collect(DISTINCT investor.screenName) WHERE handle IS NOT NULL] AS investors

    OPTIONAL MATCH (auditor:User)-[:AUDITS]->(org)
    RETURN partners,
           competitors,
           investors,
           [handle IN collect(DISTINCT auditor.screenName) WHERE handle IS NOT NULL] AS auditors
  `, { screenName })

  return results[0] ?? EMPTY_RELATIONSHIPS
}
