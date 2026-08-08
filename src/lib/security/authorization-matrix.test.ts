import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { API_AUTHORIZATION_MATRIX } from './authorization-matrix'

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findRouteFiles(path)
    return entry.name === 'route.ts' ? [path] : []
  })
}

describe('API authorization matrix', () => {
  it('classifies every API route explicitly', () => {
    const repositoryRoot = process.cwd()
    const actualRoutes = findRouteFiles(join(repositoryRoot, 'src/app/api'))
      .map(path => relative(repositoryRoot, path))
      .sort()
    const classifiedRoutes = Object.keys(API_AUTHORIZATION_MATRIX).sort()

    expect(classifiedRoutes).toEqual(actualRoutes)
  })

  it('keeps the Stripe webhook as the only public API route', () => {
    const publicRoutes = Object.entries(API_AUTHORIZATION_MATRIX)
      .filter(([, access]) => access === 'public-webhook')
      .map(([route]) => route)

    expect(publicRoutes).toEqual(['src/app/api/subscription/webhook/route.ts'])
  })
})
