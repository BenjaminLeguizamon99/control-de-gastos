import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiError } from './client'

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

  it('sends method, JSON body and Content-Type on writes', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }))
    const { api } = await import('./client')

    await api('/expenses', { method: 'POST', body: { a: 1 } })
    const init = fetchMock.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
    expect(init.headers).toEqual({ Authorization: 'Bearer old', 'Content-Type': 'application/json' })
  })

  it('retries a write after 401 with the same method and body', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
    const { api } = await import('./client')

    await api('/categories/1', { method: 'PUT', body: { name: 'x' } })
    const retry = fetchMock.mock.calls[1][1]
    expect(retry.method).toBe('PUT')
    expect(retry.body).toBe('{"name":"x"}')
    expect(retry.headers).toEqual({ Authorization: 'Bearer new', 'Content-Type': 'application/json' })
  })

  it('throws 401 when the retry also fails', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 401 }))
    const { api } = await import('./client')

    await expect(api('/me')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('exposes the field of a 422 validation error', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ detail: [{ loc: ['body', 'emoji'], msg: 'x' }] }, { status: 422 }),
    )
    const { api } = await import('./client')

    const err = await api('/categories', { method: 'POST', body: {} }).catch((e: unknown) => e)
    expect(err).toMatchObject({ status: 422 })
    expect((err as ApiError).campoInvalido()).toBe('emoji')
  })

  it('has no invalid field when the error body is not a validation error', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Not found' }, { status: 404 }))
    const { api } = await import('./client')

    const err = await api('/x').catch((e: unknown) => e)
    expect((err as ApiError).campoInvalido()).toBeUndefined()
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
