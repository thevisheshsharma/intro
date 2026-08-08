import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runQuery } from '@/lib/neo4j'
import { requireUserAccess } from '@/lib/security/api-access'
import { parseJsonBody, RequestValidationError } from '@/lib/security/request'

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  role: z.enum(['founder', 'bd', 'sales', 'marketing', 'product', 'engineering', 'investor', 'other']).or(z.literal('')),
  company: z.string().trim().max(120),
  useCases: z.array(z.enum(['intros', 'research', 'recruit'])).max(3),
}).strict()

export async function PUT(request: Request) {
  const access = await requireUserAccess(request)
  if (!access.ok) return access.response

  try {
    const profile = await parseJsonBody(request, profileSchema, 8 * 1024)
    const result = await runQuery(
      `
        MATCH (user:User {privyDid: $privyDid})
        SET user.displayName = $displayName,
            user.role = $role,
            user.company = $company,
            user.useCases = $useCases,
            user.updatedAt = datetime()
        RETURN user.privyDid AS privyDid
      `,
      { privyDid: access.actor.userId, ...profile }
    )

    if (result.length === 0) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[Profile] Failed to save onboarding profile')
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
