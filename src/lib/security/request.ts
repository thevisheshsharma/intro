import { z, type ZodType } from 'zod'

export const DEFAULT_MAX_JSON_BYTES = 32 * 1024

export class RequestValidationError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413 = 400
  ) {
    super(message)
    this.name = 'RequestValidationError'
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes: number = DEFAULT_MAX_JSON_BYTES
): Promise<T> {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength && Number(declaredLength) > maxBytes) {
    throw new RequestValidationError('Request body is too large', 413)
  }

  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > maxBytes) {
    throw new RequestValidationError('Request body is too large', 413)
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    throw new RequestValidationError('Request body must be valid JSON')
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new RequestValidationError(
      z.prettifyError(result.error) || 'Request body is invalid'
    )
  }

  return result.data
}
