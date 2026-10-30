import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth } }))

const session = (token: string) => ({ data: { session: { access_token: token } } })
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'https://api.test')
  vi.stubGlobal('fetch', fetchMock)
  auth.getSession.mockResolvedValue(session('old'))
  auth.refreshSession.mockResolvedValue(session('new'))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
  vi.resetModules()
})

describe('api', () => {
  it('on 401 refreshes the session and retries once', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
    const { api } = await import('./client')

    await expect(api('/me')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer new' })
  })

  it('throws 401 when the retry also fails', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 401 }))
    const { api } = await import('./client')

    await expect(api('/me')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('strips a trailing slash from VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.test/')
    fetchMock.mockResolvedValueOnce(Response.json({}))
    const { api } = await import('./client')

    await api('/me')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/me')
  })

  it('fails at load when VITE_API_URL is missing', async () => {
    vi.stubEnv('VITE_API_URL', '')
    await expect(import('./client')).rejects.toThrow('Falta VITE_API_URL')
  })
})
