const DEFAULT_ONBOARDING_STATUS_TIMEOUT_MS = 10_000
const DEFAULT_ANALYSIS_START_TIMEOUT_MS = 30_000

type AccessTokenGetter = () => Promise<string | null>
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

interface FetchOnboardingCompletionOptions {
  getAccessToken: AccessTokenGetter
  fetcher?: Fetcher
  timeoutMs?: number
}

interface StartOnboardingAnalysisOptions {
  getAccessToken: AccessTokenGetter
  fetcher?: Fetcher
  timeoutMs?: number
}

export class TwitterLinkRequiredError extends Error {
  constructor() {
    super('Twitter account not linked')
    this.name = 'TwitterLinkRequiredError'
  }
}

export async function fetchOnboardingCompletion({
  getAccessToken,
  fetcher = fetch,
  timeoutMs = DEFAULT_ONBOARDING_STATUS_TIMEOUT_MS,
}: FetchOnboardingCompletionOptions): Promise<boolean> {
  return runWithTimeout(async (signal) => {
    const token = await getAccessToken()

    if (!token) {
      throw new Error('Your session could not be verified. Please sign in again.')
    }

    const response = await fetcher('/api/user/onboarding-status', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal,
    })

    if (!response.ok) {
      throw new Error('We could not check your onboarding status.')
    }

    const payload: unknown = await response.json()

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('completed' in payload) ||
      typeof payload.completed !== 'boolean'
    ) {
      throw new Error('The onboarding status response was invalid.')
    }

    return payload.completed
  }, timeoutMs, 'Checking your account took too long. Please try again.')
}

export async function startOnboardingAnalysis({
  getAccessToken,
  fetcher = fetch,
  timeoutMs = DEFAULT_ANALYSIS_START_TIMEOUT_MS,
}: StartOnboardingAnalysisOptions): Promise<string> {
  return runWithTimeout(async (signal) => {
    const token = await getAccessToken()

    if (!token) {
      throw new Error('Your session could not be verified. Please sign in again.')
    }

    const response = await fetcher('/api/onboarding/analyze', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal,
    })
    const payload: unknown = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'requiresTwitter' in payload &&
        payload.requiresTwitter === true
      ) {
        throw new TwitterLinkRequiredError()
      }

      const responseError =
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof payload.error === 'string'
          ? payload.error
          : 'Analysis failed'
      throw new Error(responseError)
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('jobId' in payload) ||
      typeof payload.jobId !== 'string' ||
      !payload.jobId
    ) {
      throw new Error('The analysis did not return a valid job. Please try again.')
    }

    return payload.jobId
  }, timeoutMs, 'Starting your analysis took too long. Please try again.')
}

async function runWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([operation(controller.signal), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
