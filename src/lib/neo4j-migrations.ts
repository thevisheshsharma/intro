import { getDriver } from './neo4j'

/**
 * Migration: Convert snake_case properties to camelCase
 * - org_type -> orgType
 * - org_subtype -> orgSubtype
 * - web3_focus -> web3Focus
 *
 * This migration copies data to new camelCase properties and removes old snake_case ones.
 */
export async function migratePropertyNamesToCamelCase(): Promise<{
  migratedUsers: number
  migratedProtocols: number
}> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    console.log('Starting property naming migration (snake_case -> camelCase)...')

    // Migrate User nodes with org_type, org_subtype, or web3_focus
    const userResult = await session.run(`
      MATCH (u:User)
      WHERE u.org_type IS NOT NULL OR u.org_subtype IS NOT NULL OR u.web3_focus IS NOT NULL
      SET u.orgType = COALESCE(u.org_type, u.orgType),
          u.orgSubtype = COALESCE(u.org_subtype, u.orgSubtype),
          u.web3Focus = COALESCE(u.web3_focus, u.web3Focus)
      REMOVE u.org_type, u.org_subtype, u.web3_focus
      RETURN count(u) as migrated
    `)

    const migratedUsers = userResult.records[0]?.get('migrated')?.toNumber?.() ||
                          userResult.records[0]?.get('migrated') || 0

    console.log(`Migrated ${migratedUsers} User nodes`)

    // Also ensure any protocol nodes (which are User nodes with vibe='organization') are migrated
    const protocolResult = await session.run(`
      MATCH (p:User {vibe: 'organization'})
      WHERE p.org_type IS NOT NULL OR p.org_subtype IS NOT NULL OR p.web3_focus IS NOT NULL
      SET p.orgType = COALESCE(p.org_type, p.orgType),
          p.orgSubtype = COALESCE(p.org_subtype, p.orgSubtype),
          p.web3Focus = COALESCE(p.web3_focus, p.web3Focus)
      REMOVE p.org_type, p.org_subtype, p.web3_focus
      RETURN count(p) as migrated
    `)

    const migratedProtocols = protocolResult.records[0]?.get('migrated')?.toNumber?.() ||
                              protocolResult.records[0]?.get('migrated') || 0

    console.log(`Migrated ${migratedProtocols} Protocol/Organization nodes`)
    console.log('Property naming migration complete!')

    return { migratedUsers, migratedProtocols }
  } finally {
    await session.close()
  }
}

/**
 * Verify migration: Check if any old snake_case properties still exist
 */
export async function verifyMigration(): Promise<{
  hasOldProperties: boolean
  remainingCount: number
}> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    const result = await session.run(`
      MATCH (u:User)
      WHERE u.org_type IS NOT NULL OR u.org_subtype IS NOT NULL OR u.web3_focus IS NOT NULL
      RETURN count(u) as remaining
    `)

    const remainingCount = result.records[0]?.get('remaining')?.toNumber?.() ||
                           result.records[0]?.get('remaining') || 0

    return {
      hasOldProperties: remainingCount > 0,
      remainingCount
    }
  } finally {
    await session.close()
  }
}

/**
 * Rollback migration: Convert camelCase back to snake_case (if needed)
 */
export async function rollbackPropertyNamingMigration(): Promise<number> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    console.log('Rolling back property naming migration (camelCase -> snake_case)...')

    const result = await session.run(`
      MATCH (u:User)
      WHERE u.orgType IS NOT NULL OR u.orgSubtype IS NOT NULL OR u.web3Focus IS NOT NULL
      SET u.org_type = COALESCE(u.orgType, u.org_type),
          u.org_subtype = COALESCE(u.orgSubtype, u.org_subtype),
          u.web3_focus = COALESCE(u.web3Focus, u.web3_focus)
      REMOVE u.orgType, u.orgSubtype, u.web3Focus
      RETURN count(u) as rolledBack
    `)

    const rolledBack = result.records[0]?.get('rolledBack')?.toNumber?.() ||
                       result.records[0]?.get('rolledBack') || 0

    console.log(`Rolled back ${rolledBack} nodes`)
    return rolledBack
  } finally {
    await session.close()
  }
}

/**
 * Populate screenNameLower for all users that don't have it
 */
export async function populateScreenNameLower(): Promise<number> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    console.log('Populating screenNameLower for users...')

    const result = await session.run(`
      MATCH (u:User)
      WHERE u.screenName IS NOT NULL AND u.screenNameLower IS NULL
      SET u.screenNameLower = toLower(u.screenName)
      RETURN count(u) as updated
    `)

    const updated = result.records[0]?.get('updated')?.toNumber?.() ||
                    result.records[0]?.get('updated') || 0

    console.log(`Populated screenNameLower for ${updated} users`)
    return updated
  } finally {
    await session.close()
  }
}
