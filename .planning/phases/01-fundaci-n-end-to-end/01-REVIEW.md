---
phase: 01-fundaci-n-end-to-end
reviewed: 2026-10-30T12:00:00Z
depth: standard
files_reviewed: 41
files_reviewed_list:
  - .gitignore
  - docker-compose.yml
  - render.yaml
  - backend/.env.example
  - backend/alembic.ini
  - backend/alembic/env.py
  - backend/alembic/versions/0001_probes_rls.py
  - backend/app/auth.py
  - backend/app/config.py
  - backend/app/db.py
  - backend/app/main.py
  - backend/app/models/base.py
  - backend/app/models/probe.py
  - backend/app/repositories/probe_repo.py
  - backend/app/routers/health.py
  - backend/app/routers/me.py
  - backend/app/routers/probes.py
  - backend/pyproject.toml
  - backend/tests/conftest.py
  - backend/tests/test_auth.py
  - backend/tests/test_health.py
  - backend/tests/test_probes.py
  - backend/tests/test_rls.py
  - frontend/.env.example
  - frontend/.gitignore
  - frontend/package.json
  - frontend/index.html
  - frontend/vite.config.ts
  - frontend/wrangler.jsonc
  - frontend/src/main.tsx
  - frontend/src/env.d.ts
  - frontend/src/lib/supabase.ts
  - frontend/src/api/client.ts
  - frontend/src/app/router.tsx
  - frontend/src/app/ProtectedLayout.tsx
  - frontend/src/app/HomePage.tsx
  - frontend/src/features/auth/AuthProvider.tsx
  - frontend/src/features/auth/LoginPage.tsx
  - frontend/src/features/auth/RecoverPage.tsx
  - frontend/src/features/auth/authErrors.ts
  - frontend/src/features/auth/authErrors.test.ts
findings:
  critical: 0
  warning: 5
  info: 9
  total: 14
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-10-30T12:00:00Z
**Depth:** standard
**Files Reviewed:** 41
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

I reviewed the Phase 1 foundation: FastAPI with Supabase JWT verification, the allowlist, the ownership-scoped probe endpoint, the RLS migration, the Render and Cloudflare Workers config, and the React auth flow.

The core security pieces hold up:
- `jwt.decode` uses a fixed `algorithms` list and requires `aud`, `iss`, `exp` and `sub`.
- The allowlist fails closed when the list is empty.
- Ownership is enforced in the SQL `WHERE`, and a probe that belongs to someone else returns 404.
- RLS is enabled on `probes` and `alembic_version`, and a test guards every table in `public`.
- The frontend only uses the publishable key. The built bundle contains no secret key and no DB URL; the only `sb_secret_` match is a prefix check inside the supabase-js library.
- PyJWKClient 2.15 has a refetch cooldown, so a token with an unknown `kid` cannot make the backend fetch the JWKS on every request.

I found no blockers. The main concerns:
- **Transaction timing:** `get_session` commits after the response has already been sent. This becomes a silent data-loss bug as soon as Phase 2 adds write endpoints.
- **Error mapping:** some failures are reported as the wrong problem. JWKS outages become 401, and 401 is shown to the user as "no tiene acceso". Unknown Supabase error codes are shown as network errors.
- **Config:** a trailing slash in `SUPABASE_URL` is not stripped, and a missing `VITE_API_URL` is not caught.

## Warnings

### WR-01: The DB transaction commits after the HTTP response is sent

**File:** `backend/app/db.py:19-21` (used via `Depends(get_session)` in `backend/app/routers/probes.py:23` and `backend/app/routers/health.py:13`)
**Issue:** The installed FastAPI is 0.162.0. In this version, a `yield` dependency with no explicit scope uses scope `"request"`: its cleanup code runs after the response has been sent. `session.begin()` commits during that cleanup. Once a POST, PUT or DELETE endpoint exists, the client gets a 2xx before the commit runs. If the commit then fails (constraint violation, pooler disconnect, serialization error), the gasto is lost while the frontend believes it was saved and invalidates its queries on that basis. Nothing breaks today because only GET endpoints exist, but every Phase 2 write will inherit this pattern.
**Fix:** Commit before the response is built, by making the dependency function-scoped:
```python
SessionDep = Annotated[Session, Depends(get_session, scope="function")]
# routers: session: SessionDep
```
The alternative is to drop `session.begin()` from the dependency and call `session.commit()` explicitly in the write path. Either way, add a test where a write fails at commit time and the API must return a 5xx.

### WR-02: A JWKS outage returns 401, and the UI tells the user their account has no access

**File:** `backend/app/auth.py:33`, `frontend/src/app/HomePage.tsx:13`
**Issue:** `PyJWKClientConnectionError` is a subclass of `PyJWTError`. So when Supabase's JWKS endpoint is unreachable or slow (more than 30s), the backend returns 401 "Invalid token". `HomePage` treats 401 the same as 403 and shows "Tu cuenta no tiene acceso. Cerrá sesión e ingresá con otra." The same wrong message appears whenever the access token is merely expired or not yet valid, for example after a device sleep or with clock skew. In both cases the only allowlisted user is told to log out, for a problem that is transient or fixed by a token refresh.
**Fix:**
```python
except jwt.PyJWKClientConnectionError:
    raise HTTPException(503, "Auth provider unavailable") from None
except (jwt.PyJWTError, ValueError):
    raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"}) from None
```
On the frontend, set `denied = error.status === 403`. On a 401, call `supabase.auth.refreshSession()` and retry once (or sign out), and show the generic error for everything else.

### WR-03: A trailing slash in `SUPABASE_URL` makes every token fail the issuer check

**File:** `backend/app/config.py:11` (used in `backend/app/auth.py:14,29`)
**Issue:** The "sin barra final" rule is only a comment; nothing enforces it. With `SUPABASE_URL=https://x.supabase.co/` (which is what the Supabase dashboard copy button gives in some views), the expected issuer becomes `https://x.supabase.co//auth/v1` and the JWKS URL gets a `//`. Every request then returns 401, and because of WR-02 the user sees "no tiene acceso". It is a config typo that looks like an authorization failure.
**Fix:**
```python
from pydantic import field_validator

@field_validator("supabase_url")
@classmethod
def _strip_slash(cls, v: str) -> str:
    return v.rstrip("/")
```

### WR-04: A missing `VITE_API_URL` is not caught and shows up as a misleading network error

**File:** `frontend/src/lib/supabase.ts:5`, `frontend/src/api/client.ts:15`
**Issue:** `supabase.ts` checks the two Supabase variables at startup but not `VITE_API_URL`. If it is missing from the Cloudflare build env, the code fetches `undefined/me`, which is a relative URL. Workers SPA fallback (`not_found_handling: single-page-application`) answers it with `index.html` and a 200, so `res.ok` passes and `res.json()` throws a SyntaxError. The user sees "No pudimos conectar con el servidor", and nothing points to the missing build variable. A trailing slash in the value would also produce `//me`, which is not normalized.
**Fix:** Validate it next to the others and strip the slash:
```ts
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
if (!API_URL) throw new Error('Falta VITE_API_URL (ver frontend/.env.example)')
```

### WR-05: Every unmapped Supabase error is shown as a connection error that tells the user to tap a "Reintentar" button that does not exist

**File:** `frontend/src/features/auth/authErrors.ts:16-19` (used in `LoginPage.tsx:31`, `RecoverPage.tsx:75,81`)
**Issue:** Any `error.code` outside the six mapped ones falls back to `NETWORK_ERROR`. Examples include `email_not_confirmed`, `user_banned`, `validation_failed`, `session_not_found`, `reauthentication_needed` (with "secure password change" on), and `same_password` variants. The message says the server is unreachable and to tap "Reintentar", but LoginPage and RecoverPage have no Reintentar button. The real cause is hidden, and the user is pushed to retry something that will never succeed. The test at `authErrors.test.ts:22` locks this behavior in.
**Fix:** Keep `NETWORK_ERROR` for the thrown and no-code case only, and add a generic message for codes that are present but unmapped:
```ts
const GENERIC = 'Algo salió mal. Intentá de nuevo en unos minutos.'
export function authErrorMessage(code: string | undefined): string {
  if (!code) return NETWORK_ERROR
  return Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : GENERIC
}
```

## Info

### IN-01: The JWKS client uses the 30s default timeout while holding a lock

**File:** `backend/app/auth.py:14`
**Issue:** `PyJWKClient` holds `_client_lock` while it fetches the JWKS (the cache refreshes every 300s). If Supabase is slow, every authenticated request queues behind that lock for up to 30s and ties up threadpool workers.
**Fix:** `jwt.PyJWKClient(url, timeout=5)`.

### IN-02: React Query retries 401 and 403

**File:** `frontend/src/main.tsx:9`
**Issue:** `retry: 1` applies to every error, so auth failures are retried pointlessly, which doubles the latency on a Render cold start.
**Fix:** `retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 1`.

### IN-03: The test Postgres listens on all network interfaces with `postgres/postgres`

**File:** `docker-compose.yml:8`
**Fix:** `ports: ["127.0.0.1:5433:5432"]`.

### IN-04: The startup `getSession()` call is redundant and has no error handling

**File:** `frontend/src/features/auth/AuthProvider.tsx:13`
**Issue:** `onAuthStateChange` already emits `INITIAL_SESSION`. The extra `getSession().then` has no `.catch`, so a rejection is unhandled. If it resolves late, it can also overwrite a newer session state.
**Fix:** Remove the `getSession()` call and rely on `INITIAL_SESSION`.

### IN-05: The query cache is only cleared on an explicit logout

**File:** `frontend/src/app/ProtectedLayout.tsx:13-18`
**Issue:** A `SIGNED_OUT` that comes from a failed token refresh or from another tab does not clear the cache. The next login briefly shows the previous data. The impact is low for a single user.
**Fix:** Call `queryClient.clear()` inside `onAuthStateChange` when the event is `SIGNED_OUT`.

### IN-06: No test covers the `require` option for missing claims

**File:** `backend/tests/test_auth.py`
**Issue:** No test sends a properly signed token that lacks `exp` or `sub`. Someone could remove `options={"require": [...]}` without any test failing. A token without `exp` would then never expire.
**Fix:** Add a test, e.g. `jwt.encode({k: v for k, v in base_claims().items() if k != "exp"}, KEY, "ES256", headers={"kid": "test"})` must return 401. Do the same for a token without `sub`.

### IN-07: The static frontend sends no security headers

**File:** `frontend/wrangler.jsonc`
**Issue:** supabase-js stores the session (including the refresh token) in localStorage, so any XSS means the account is taken over. The site sends no CSP, `X-Frame-Options` or `Referrer-Policy`.
**Fix:** Add `frontend/public/_headers` with a strict CSP. `connect-src` should list the Supabase URL and the API URL. Add `frame-ancestors 'none'`.

### IN-08: The `.wrangler/` folder is not git-ignored

**File:** `.gitignore`, `frontend/.gitignore`
**Issue:** `wrangler dev` and `wrangler deploy` write local state to `frontend/.wrangler/`.
**Fix:** Add `.wrangler/` to `.gitignore`.

### IN-09: The migration's downgrade does not undo every change from the upgrade

**File:** `backend/alembic/versions/0001_probes_rls.py:30-31`
**Issue:** `upgrade` enables RLS on `alembic_version`, but `downgrade` leaves it on. This is harmless in practice, but the migration is not symmetric.
**Fix:** Add `op.execute("ALTER TABLE alembic_version DISABLE ROW LEVEL SECURITY")`, or a comment saying the asymmetry is intentional.

---

_Reviewed: 2026-10-30T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
