import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  responses: vi.fn((model: string) => `responses:${model}`),
  webSearch: vi.fn(() => ({ type: 'web-search' })),
  xSearch: vi.fn((options: unknown) => ({ type: 'x-search', options })),
}))

vi.mock('ai', async importOriginal => {
  const actual = await importOriginal<typeof import('ai')>()
  return { ...actual, generateText: mocks.generateText }
})

vi.mock('@ai-sdk/xai', () => ({
  xai: Object.assign(vi.fn(), {
    responses: mocks.responses,
    tools: {
      webSearch: mocks.webSearch,
      xSearch: mocks.xSearch,
    },
  }),
}))

import { NoOutputGeneratedError } from 'ai'
import {
  generateClassification,
  generateResearchedObject,
} from './client'

describe('xAI integration resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.XAI_API_KEY = 'test-key'
  })

  it('retries malformed structured classification once', async () => {
    mocks.generateText
      .mockRejectedValueOnce(new NoOutputGeneratedError())
      .mockResolvedValueOnce({ output: { result: 'individual' } })

    const result = await generateClassification({
      schema: z.object({ result: z.string() }),
      system: 'Classify.',
      prompt: 'Profile.',
    })

    expect(result).toEqual({ result: 'individual' })
    expect(mocks.generateText).toHaveBeenCalledTimes(2)
    expect(mocks.responses).toHaveBeenCalledWith('grok-4.5')
    expect(mocks.generateText.mock.calls[1][0].system).toContain('previous response')
  })

  it('separates live research from schema conversion', async () => {
    mocks.generateText
      .mockResolvedValueOnce({ text: 'Grounded facts from X and the web.' })
      .mockResolvedValueOnce({ output: { name: 'Alpha' } })

    const result = await generateResearchedObject({
      task: 'icpResearch',
      schema: z.object({ name: z.string() }),
      system: 'Research current information.',
      prompt: 'Research Alpha.',
      xSearchFromDate: '2026-01-01',
      xSearchToDate: '2026-08-10',
    })

    expect(result).toEqual({ name: 'Alpha' })
    expect(mocks.generateText).toHaveBeenCalledTimes(2)
    expect(mocks.generateText.mock.calls[0][0].tools).toEqual(expect.objectContaining({
      web_search: expect.anything(),
      x_search: expect.anything(),
    }))
    expect(mocks.generateText.mock.calls[1][0].tools).toBeUndefined()
    expect(mocks.generateText.mock.calls[1][0].prompt).toContain('<untrusted_research>')
  })

  it('reports timeout failures distinctly', async () => {
    mocks.generateText.mockRejectedValue(new DOMException('timed out', 'TimeoutError'))

    await expect(generateClassification({
      schema: z.object({ result: z.string() }),
      system: 'Classify.',
      prompt: 'Profile.',
    })).rejects.toMatchObject({ code: 'timeout' })
  })
})
