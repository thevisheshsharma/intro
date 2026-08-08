import { timingSafeEqual } from 'node:crypto'

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function hasValidSecret(
  providedSecret: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!providedSecret || !expectedSecret) {
    return false
  }

  return safeEqual(providedSecret, expectedSecret)
}

export function hasValidBearerSecret(
  authorizationHeader: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return false
  }

  return hasValidSecret(authorizationHeader.slice('Bearer '.length), expectedSecret)
}
