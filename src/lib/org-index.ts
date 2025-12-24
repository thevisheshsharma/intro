import { runQuery } from './neo4j'

/**
 * In-memory index of org → employee relationships for fast lookups.
 * This pre-computes common org relationships to speed up org-based queries.
 */

// Map of orgUserId → Set of employeeUserIds
const orgEmployeeIndex = new Map<string, Set<string>>()

// Map of employeeUserId → Set of orgUserIds (reverse lookup)
const employeeOrgIndex = new Map<string, Set<string>>()

// Last refresh timestamp
let lastRefreshTime: number = 0
const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Refresh the org index from Neo4j
 */
export async function refreshOrgIndex(): Promise<void> {
  console.log(`🔄 Refreshing org index...`)
  const startTime = Date.now()

  try {
    const query = `
      MATCH (employee:User)-[:WORKS_AT]->(org:User {vibe: 'organization'})
      RETURN org.userId as orgId, org.screenName as orgScreenName, collect(employee.userId) as employeeIds
    `
    const results = await runQuery(query, {})

    // Clear existing indexes
    orgEmployeeIndex.clear()
    employeeOrgIndex.clear()

    // Build both indexes
    for (const record of results) {
      const orgId = record.orgId
      const employeeIds: string[] = record.employeeIds || []

      // Build org → employees index
      orgEmployeeIndex.set(orgId, new Set(employeeIds))

      // Build employee → orgs reverse index
      for (const empId of employeeIds) {
        if (!employeeOrgIndex.has(empId)) {
          employeeOrgIndex.set(empId, new Set())
        }
        employeeOrgIndex.get(empId)!.add(orgId)
      }
    }

    lastRefreshTime = Date.now()
    const duration = Date.now() - startTime

    console.log(`✅ Org index refreshed in ${duration}ms: ${orgEmployeeIndex.size} orgs, ${employeeOrgIndex.size} employees`)
  } catch (error) {
    console.error('❌ Failed to refresh org index:', error)
    throw error
  }
}

/**
 * Ensure the index is fresh, refreshing if needed
 */
export async function ensureOrgIndexFresh(): Promise<void> {
  if (Date.now() - lastRefreshTime > REFRESH_INTERVAL_MS) {
    await refreshOrgIndex()
  }
}

/**
 * Get all employees of an org
 */
export function getOrgEmployees(orgId: string): string[] {
  return Array.from(orgEmployeeIndex.get(orgId) || [])
}

/**
 * Get all orgs an employee works at
 */
export function getEmployeeOrgs(employeeId: string): string[] {
  return Array.from(employeeOrgIndex.get(employeeId) || [])
}

/**
 * Find orgs shared by two users
 */
export function getSharedOrgs(userAId: string, userBId: string): string[] {
  const aOrgs = employeeOrgIndex.get(userAId)
  const bOrgs = employeeOrgIndex.get(userBId)

  if (!aOrgs || !bOrgs) return []

  const sharedOrgs: string[] = []
  aOrgs.forEach(orgId => {
    if (bOrgs.has(orgId)) {
      sharedOrgs.push(orgId)
    }
  })

  return sharedOrgs
}

/**
 * Check if two users share any org
 */
export function usersShareOrg(userAId: string, userBId: string): boolean {
  const aOrgs = employeeOrgIndex.get(userAId)
  const bOrgs = employeeOrgIndex.get(userBId)

  if (!aOrgs || !bOrgs) return false

  let sharesOrg = false
  aOrgs.forEach(orgId => {
    if (bOrgs.has(orgId)) sharesOrg = true
  })
  return sharesOrg
}

/**
 * Get employees who work at any of the same orgs as the given user
 */
export function getCoworkers(userId: string): string[] {
  const userOrgs = employeeOrgIndex.get(userId)
  if (!userOrgs) return []

  const coworkers = new Set<string>()
  userOrgs.forEach(orgId => {
    const employees = orgEmployeeIndex.get(orgId)
    if (employees) {
      employees.forEach(empId => {
        if (empId !== userId) coworkers.add(empId)
      })
    }
  })

  const result: string[] = []
  coworkers.forEach(id => result.push(id))
  return result
}

/**
 * Get index stats
 */
export function getOrgIndexStats(): {
  orgCount: number
  employeeCount: number
  lastRefreshTime: number
  isStale: boolean
} {
  return {
    orgCount: orgEmployeeIndex.size,
    employeeCount: employeeOrgIndex.size,
    lastRefreshTime,
    isStale: Date.now() - lastRefreshTime > REFRESH_INTERVAL_MS,
  }
}

/**
 * Check if index is initialized
 */
export function isOrgIndexInitialized(): boolean {
  return lastRefreshTime > 0
}
