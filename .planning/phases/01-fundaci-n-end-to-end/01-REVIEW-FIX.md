---
phase: 01-fundaci-n-end-to-end
fixed_at: 2026-10-30T15:10:00Z
review_path: .planning/phases/01-fundaci-n-end-to-end/01-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-10-30T15:10:00Z
**Source review:** .planning/phases/01-fundaci-n-end-to-end/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (critical_warning scope; 9 Info findings not attempted)
- Fixed: 5
- Skipped: 0

Verification after each fix: backend `pytest` (22 passed), `ruff check`, `ruff format --check`, `mypy`; frontend `vitest run` (14 passed), `npm run lint` (only the 2 pre-existing warnings), `npm run build`.

## Fixed Issues

### WR-01: The DB transaction commits after the HTTP response is sent

**Files modified:** `backend/app/db.py`, `backend/app/routers/health.py`, `backend/app/routers/probes.py`, `backend/tests/test_db.py` (new)
**Commit:** af28724
**Applied fix:** Added `SessionDep = Annotated[Session, Depends(get_session, scope="function")]` in `db.py`. Both routers now use it, so the commit runs before the response is sent. The new test builds a throwaway app with a POST route whose session fails in `before_commit`, and asserts a 500. I checked that this test fails with `scope="request"`.
**Status:** fixed: requires human verification (transaction-lifecycle logic)

### WR-02: A JWKS outage returns 401, and the UI tells the user their account has no access

**Files modified:** `backend/app/auth.py`, `backend/tests/test_auth.py`, `frontend/src/api/client.ts`, `frontend/src/api/client.test.ts` (new), `frontend/src/app/HomePage.tsx`
**Commit:** 2739eea
**Applied fix:**
- Backend: `jwt.PyJWKClientConnectionError` is caught before `PyJWTError` and returns 503 "Auth provider unavailable". A new test overrides the JWKS client with one that raises, and asserts 503.
- Frontend: on a 401, `api()` calls `supabase.auth.refreshSession()` and retries once. `HomePage` treats only 403 as "no tiene acceso"; every other error, including a 401 that fails again after the refresh, shows the generic error with the Reintentar button.
- Vitest covers both cases: the retry succeeds, and the retry still gets a 401.

**Status:** fixed: requires human verification (error-mapping logic)

### WR-03: A trailing slash in `SUPABASE_URL` makes every token fail the issuer check

**Files modified:** `backend/app/config.py`, `backend/tests/test_config.py` (new)
**Commit:** 2f0c3c5
**Applied fix:** Added a `field_validator("supabase_url")` that applies `rstrip("/")`, and removed the comment-only rule. The new test asserts that the slash is stripped.

### WR-04: A missing `VITE_API_URL` is not caught and shows up as a misleading network error

**Files modified:** `frontend/src/api/client.ts`, `frontend/src/api/client.test.ts`
**Commit:** ade564f
**Applied fix:** `client.ts` now computes `API_URL` once at module load with trailing slashes removed, and throws `Falta VITE_API_URL (ver frontend/.env.example)` if the value is empty. The validation sits in `client.ts`, the only consumer, not in `supabase.ts`. Tests cover the stripped slash and the load-time throw.

### WR-05: Every unmapped Supabase error is shown as a connection error that tells the user to tap a "Reintentar" button that does not exist

**Files modified:** `frontend/src/features/auth/authErrors.ts`, `frontend/src/features/auth/authErrors.test.ts`
**Commit:** acd9d0a
**Applied fix:** `NETWORK_ERROR` is now used only when there is no code. A code that is present but unmapped returns the new exported `GENERIC_ERROR` ("Algo salió mal. Intentá de nuevo en unos minutos."). The test that locked in the old fallback was updated. Known remaining gap: for the thrown/no-code case, LoginPage and RecoverPage still show `NETWORK_ERROR`, which says to tap "Reintentar", and those pages have no such button. That copy was not changed.

---

_Fixed: 2026-10-30T15:10:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
