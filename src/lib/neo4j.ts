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
      
      // Check if this is a deadlock error
      const isDeadlock = error.message?.includes('ForsetiClient') && 
                        error.message?.includes('ExclusiveLock') &&
                        error.message?.includes('waiting for')
      
      if (isDeadlock && attempt < maxRetries) {
        console.warn(`⚠️ Deadlock detected on attempt ${attempt}/${maxRetries}, retrying after delay...`)
        // Wait with exponential backoff
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else if (!isDeadlock) {
        // For non-deadlock errors, don't retry
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
