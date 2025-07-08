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

// Utility function to run a query with automatic session management
export async function runQuery<T = any>(
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

    console.log('Neo4j schema initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Neo4j schema:', error)
    throw error
  } finally {
    await session.close()
  }
}
