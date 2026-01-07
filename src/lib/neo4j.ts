import neo4j, { Driver, Session } from 'neo4j-driver'

let driver: Driver | null = null

function createDriver(): Driver {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const user = process.env.NEO4J_USERNAME || 'neo4j'
  const password = process.env.NEO4J_PASSWORD || 'password'

  return neo4j.driver(uri, neo4j.auth.basic(user, password))
}

export function getDriver(): Driver {
  if (!driver) {
    driver = createDriver()
  }
  return driver
}

export async function getSession(): Promise<Session> {
  return getDriver().session()
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }
}

// Utility function to run a query with automatic session management and deadlock retry
export async function runQuery<T = any>(
  query: string,
  parameters: Record<string, any> = {},
  maxRetries: number = 3
): Promise<T[]> {
  let lastError: any = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await getSession()
    try {
      const result = await session.run(query, parameters)
      return result.records.map(record => record.toObject())
    } catch (error: any) {
      lastError = error

      // Check if this is a deadlock error or a uniqueness constraint violation during concurrent MERGE
      const isDeadlock = error.message?.includes('ForsetiClient') &&
        error.message?.includes('ExclusiveLock') &&
        error.message?.includes('waiting for')

      const isConstraintViolation = error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed' ||
        error.message?.includes('already exists with label')

      if ((isDeadlock || isConstraintViolation) && attempt < maxRetries) {
        const errorType = isDeadlock ? 'Deadlock' : 'Constraint violation'
        console.warn(`⚠️ ${errorType} detected on attempt ${attempt}/${maxRetries}, retrying after delay...`)
        // Wait with exponential backoff
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else if (!isDeadlock && !isConstraintViolation) {
        // For other errors, don't retry
        throw error
      }
    } finally {
      await session.close()
    }
  }

  // If we get here, all retries failed
  console.error(`❌ All ${maxRetries} attempts failed due to deadlocks`)
  throw lastError
}

// Run a query without automatic retry on constraint violations
// Used when the caller wants to handle constraint violations themselves (e.g., for optimistic locking)
export async function runQueryWithoutRetry<T = any>(
  query: string,
  parameters: Record<string, any> = {}
): Promise<T[]> {
  const session = await getSession()
  try {
    const result = await session.run(query, parameters)
    return result.records.map(record => record.toObject())
  } finally {
    await session.close()
  }
}

// Enhanced batch query function with automatic chunking for large datasets
export async function runBatchQuery<T = any>(
  query: string,
  parameters: Record<string, any> = {},
  batchSize: number = 1000
): Promise<T[]> {
  // For single parameter that's an array, chunk it
  const arrayParam = Object.entries(parameters).find(([key, value]) => Array.isArray(value))

  if (!arrayParam || arrayParam[1].length <= batchSize) {
    // No array parameter or small enough, run normally
    return runQuery<T>(query, parameters)
  }

  const [arrayKey, arrayValue] = arrayParam
  const chunks = []

  // Split array into chunks
  for (let i = 0; i < arrayValue.length; i += batchSize) {
    chunks.push(arrayValue.slice(i, i + batchSize))
  }

  // Run queries for each chunk and combine results
  const allResults: T[] = []

  for (const chunk of chunks) {
    const chunkParams = { ...parameters, [arrayKey]: chunk }
    const chunkResults = await runQuery<T>(query, chunkParams)
    allResults.push(...chunkResults)
  }

  return allResults
}

// Initialize the database schema (constraints and indexes)
export async function initializeSchema(): Promise<void> {
  const session = await getSession()
  try {
    // Create uniqueness constraint on User.userId (automatically creates index)
    await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.userId IS UNIQUE
    `)

    // Create index on User.screenName for fast lookups
    await session.run(`
      CREATE INDEX user_screen_name_index IF NOT EXISTS
      FOR (u:User) ON (u.screenName)
    `)

    // Create index on User.screenNameLower for case-insensitive lookups (avoids toLower() overhead)
    await session.run(`
      CREATE INDEX user_screen_name_lower_index IF NOT EXISTS
      FOR (u:User) ON (u.screenNameLower)
    `)

    // Create index on User.vibe for organization filtering
    await session.run(`
      CREATE INDEX user_vibe_index IF NOT EXISTS
      FOR (u:User) ON (u.vibe)
    `)

    // Create index on User.department for department matching
    await session.run(`
      CREATE INDEX user_department_index IF NOT EXISTS
      FOR (u:User) ON (u.department)
    `)

    console.log('Neo4j schema initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Neo4j schema:', error)
    throw error
  } finally {
    await session.close()
  }
}

// Backfill screenNameLower for existing users
export async function backfillScreenNameLower(): Promise<number> {
  const query = `
    MATCH (u:User)
    WHERE u.screenNameLower IS NULL AND u.screenName IS NOT NULL
    SET u.screenNameLower = toLower(u.screenName)
    RETURN count(u) as updated
  `
  const result = await runQuery<{ updated: { low: number; high: number } }>(query, {})
  const updated = result[0]?.updated?.low || 0
  console.log(`Backfilled screenNameLower for ${updated} users`)
  return updated
}

// Deduplicate users with the same screenName (different case variations)
// This merges duplicate nodes, keeping the one with a Twitter ID (numeric) over org_ IDs
export async function deduplicateUsers(): Promise<{ merged: number; deleted: number }> {
  // Step 1: Find all duplicate screenNames (case-insensitive)
  const findDuplicatesQuery = `
    MATCH (u:User)
    WHERE u.screenName IS NOT NULL
    WITH toLower(u.screenName) as screenNameLower, collect(u) as users
    WHERE size(users) > 1
    RETURN screenNameLower, users
  `

  const duplicates = await runQuery<{ screenNameLower: string; users: any[] }>(findDuplicatesQuery, {})

  if (duplicates.length === 0) {
    console.log('✅ No duplicate users found')
    return { merged: 0, deleted: 0 }
  }

  console.log(`🔄 Found ${duplicates.length} screenNames with duplicates`)

  let totalMerged = 0
  let totalDeleted = 0

  for (const { screenNameLower, users } of duplicates) {
    // Sort users: prefer numeric Twitter IDs over org_ IDs
    const sortedUsers = users.sort((a, b) => {
      const aProps = a.properties || a
      const bProps = b.properties || b
      const aId = aProps.userId
      const bId = bProps.userId

      // Prefer numeric IDs (Twitter IDs) over org_ IDs
      const aIsNumeric = /^\d+$/.test(aId)
      const bIsNumeric = /^\d+$/.test(bId)

      if (aIsNumeric && !bIsNumeric) return -1
      if (!aIsNumeric && bIsNumeric) return 1

      // If both same type, prefer the one with more data (followers, etc)
      // Handle Neo4j BigInt objects (they have .low property)
      const aFollowersRaw = aProps.followersCount
      const bFollowersRaw = bProps.followersCount
      const aFollowers = typeof aFollowersRaw === 'object' ? (aFollowersRaw?.low || 0) : (aFollowersRaw || 0)
      const bFollowers = typeof bFollowersRaw === 'object' ? (bFollowersRaw?.low || 0) : (bFollowersRaw || 0)
      return Number(bFollowers) - Number(aFollowers)
    })

    const keepUser = sortedUsers[0].properties || sortedUsers[0]
    const keepUserId = keepUser.userId
    const deleteUsers = sortedUsers.slice(1)
      .map((u: any) => (u.properties || u).userId)
      .filter((id: string) => id && id.trim() !== '') // Filter out empty userIds

    console.log(`  Merging @${screenNameLower}: keeping ${keepUserId}, deleting ${deleteUsers.join(', ')}`)

    // Skip if no valid users to delete
    if (deleteUsers.length === 0) {
      console.log(`  Skipping @${screenNameLower}: no valid duplicates to delete`)
      continue
    }

    // Merge relationships from duplicate users to the kept user
    for (const deleteUserId of deleteUsers) {
      // Transfer incoming FOLLOWS relationships
      const transferIncomingQuery = `
        MATCH (follower:User)-[r:FOLLOWS]->(old:User {userId: $deleteUserId})
        MATCH (keep:User {userId: $keepUserId})
        WHERE NOT (follower)-[:FOLLOWS]->(keep)
        MERGE (follower)-[:FOLLOWS]->(keep)
        DELETE r
        RETURN count(r) as transferred
      `
      await runQuery(transferIncomingQuery, { deleteUserId, keepUserId })

      // Transfer outgoing FOLLOWS relationships
      const transferOutgoingQuery = `
        MATCH (old:User {userId: $deleteUserId})-[r:FOLLOWS]->(following:User)
        MATCH (keep:User {userId: $keepUserId})
        WHERE NOT (keep)-[:FOLLOWS]->(following)
        MERGE (keep)-[:FOLLOWS]->(following)
        DELETE r
        RETURN count(r) as transferred
      `
      await runQuery(transferOutgoingQuery, { deleteUserId, keepUserId })

      // Transfer other relationships (WORKS_AT, etc)
      const transferOtherQuery = `
        MATCH (old:User {userId: $deleteUserId})-[r]->(target)
        WHERE type(r) <> 'FOLLOWS'
        MATCH (keep:User {userId: $keepUserId})
        CALL apoc.create.relationship(keep, type(r), properties(r), target) YIELD rel
        DELETE r
        RETURN count(r) as transferred
      `
      try {
        await runQuery(transferOtherQuery, { deleteUserId, keepUserId })
      } catch (e) {
        // APOC might not be available, skip non-FOLLOWS relationships
      }

      // Delete the duplicate user
      const deleteQuery = `
        MATCH (u:User {userId: $deleteUserId})
        DETACH DELETE u
        RETURN count(u) as deleted
      `
      await runQuery(deleteQuery, { deleteUserId })
      totalDeleted++
    }

    totalMerged++
  }

  console.log(`✅ Deduplicated ${totalMerged} screenNames, deleted ${totalDeleted} duplicate nodes`)
  return { merged: totalMerged, deleted: totalDeleted }
}

// Merge Privy-only users with matching Twitter users
// This fixes the issue where Privy login created separate nodes from Twitter sync
export async function mergePrivyUsers(): Promise<{ merged: number; deleted: number }> {
  console.log('🔗 Merging Privy users with Twitter users...')

  // Find Privy-only users that have a screenName matching a Twitter user
  const findQuery = `
    MATCH (privyUser:User)
    WHERE privyUser.privyDid IS NOT NULL
    AND (privyUser.userId IS NULL OR privyUser.userId = '' OR privyUser.userId STARTS WITH 'did:')
    AND privyUser.screenName IS NOT NULL
    
    MATCH (twitterUser:User)
    WHERE toLower(twitterUser.screenName) = toLower(privyUser.screenName)
    AND twitterUser.userId IS NOT NULL
    AND twitterUser.userId <> ''
    AND NOT twitterUser.userId STARTS WITH 'did:'
    AND twitterUser.privyDid IS NULL
    
    RETURN 
      privyUser.privyDid as privyDid,
      privyUser.screenName as screenName,
      privyUser.plan as plan,
      privyUser.subscriptionStatus as subscriptionStatus,
      privyUser.trialStartedAt as trialStartedAt,
      privyUser.trialEndsAt as trialEndsAt,
      privyUser.stripeCustomerId as stripeCustomerId,
      privyUser.onboardingCompletedAt as onboardingCompletedAt,
      twitterUser.userId as twitterUserId
  `

  const matches = await runQuery<{
    privyDid: string
    screenName: string
    plan: string | null
    subscriptionStatus: string | null
    trialStartedAt: any
    trialEndsAt: any
    stripeCustomerId: string | null
    onboardingCompletedAt: any
    twitterUserId: string
  }>(findQuery, {})

  if (matches.length === 0) {
    console.log('✅ No Privy users need merging')
    return { merged: 0, deleted: 0 }
  }

  console.log(`🔄 Found ${matches.length} Privy users to merge with Twitter users`)

  let merged = 0
  let deleted = 0

  for (const match of matches) {
    console.log(`  Merging Privy user @${match.screenName} into Twitter user ${match.twitterUserId}`)

    // Transfer Privy data to Twitter user and delete Privy-only user
    const mergeQuery = `
      MATCH (twitterUser:User {userId: $twitterUserId})
      MATCH (privyUser:User {privyDid: $privyDid})
      WHERE privyUser.userId IS NULL OR privyUser.userId = '' OR privyUser.userId STARTS WITH 'did:'
      
      // Transfer Privy properties to Twitter user
      SET twitterUser.privyDid = $privyDid,
          twitterUser.plan = COALESCE($plan, twitterUser.plan),
          twitterUser.subscriptionStatus = COALESCE($subscriptionStatus, twitterUser.subscriptionStatus),
          twitterUser.trialStartedAt = CASE WHEN $trialStartedAt IS NOT NULL THEN $trialStartedAt ELSE twitterUser.trialStartedAt END,
          twitterUser.trialEndsAt = CASE WHEN $trialEndsAt IS NOT NULL THEN $trialEndsAt ELSE twitterUser.trialEndsAt END,
          twitterUser.stripeCustomerId = COALESCE($stripeCustomerId, twitterUser.stripeCustomerId),
          twitterUser.onboardingCompletedAt = COALESCE($onboardingCompletedAt, twitterUser.onboardingCompletedAt),
          twitterUser.onboardingCompleted = true
      
      // Transfer any relationships from Privy user
      WITH twitterUser, privyUser
      
      // Delete the Privy-only user
      DETACH DELETE privyUser
      
      RETURN twitterUser.userId as mergedUserId
    `

    try {
      await runQuery(mergeQuery, {
        twitterUserId: match.twitterUserId,
        privyDid: match.privyDid,
        plan: match.plan,
        subscriptionStatus: match.subscriptionStatus,
        trialStartedAt: match.trialStartedAt,
        trialEndsAt: match.trialEndsAt,
        stripeCustomerId: match.stripeCustomerId,
        onboardingCompletedAt: match.onboardingCompletedAt
      })
      merged++
      deleted++
    } catch (err: any) {
      console.error(`  Failed to merge @${match.screenName}:`, err.message)
    }
  }

  console.log(`✅ Merged ${merged} Privy users into Twitter users, deleted ${deleted} orphan nodes`)
  return { merged, deleted }
}
