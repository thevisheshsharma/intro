import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseJsonBody } from './request'

const schema = z.object({ name: z.string().min(1).max(10) }).strict()

describe('parseJsonBody', () => {
  it('parses a valid bounded body', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Berri' }),
    })

    await expect(parseJsonBody(request, schema)).resolves.toEqual({ name: 'Berri' })
  })

  it('rejects malformed JSON without leaking parser details', async () => {
    const request = new Request('http://localhost/test', { method: 'POST', body: '{' })
    await expect(parseJsonBody(request, schema)).rejects.toEqual(
      expect.objectContaining({
        message: 'Request body must be valid JSON',
        status: 400,
      })
    )
  })

  it('rejects bodies larger than the configured cap', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Berri' }),
    })
    await expect(parseJsonBody(request, schema, 4)).rejects.toEqual(
      expect.objectContaining({ status: 413 })
    )
  })
})
