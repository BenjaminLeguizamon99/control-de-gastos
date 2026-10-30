---
phase: 01-fundaci-n-end-to-end
verified: 2026-10-30T16:30:00Z
status: passed
score: 5/5 roadmap truths verified (SC5 with one minor mypy caveat)
overrides_applied: 1
override_note: "AUTH-02 PWA-installed persistence deferred to Phase 7 by user (2026-10-30); tracked in 01-HUMAN-UAT.md"
gaps: []
human_verification:
  - test: "AUTH-02 en PWA instalada"
    expected: "Al reabrir la PWA instalada la sesión persiste"
    why_human: "La PWA se difiere a Phase 7 por decisión del usuario; hoy solo se verificó recarga y reinicio del navegador (aprobado por el usuario)"
---

# Phase 1: Fundación end-to-end Verification Report

**Goal:** El usuario puede iniciar sesión en la app desplegada y el backend reconoce quién es, con la seguridad de datos resuelta desde el día uno.
**Status:** human_needed (sin gaps bloqueantes). Re-verification: No.

## Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Login email+password, recarga persiste, logout | VERIFIED | `LoginPage.tsx` usa `signInWithPassword`; `supabase.ts` con defaults persistSession/autoRefresh; `ProtectedLayout.tsx` `signOut({scope:'local'})` en el layout protegido; usuario aprobó login por teléfono, recarga, reinicio de navegador y logout. `/login` en prod = 200. |
| 2 | Sin JWT / vencido / otro algoritmo = 401; `/me` devuelve user_id | VERIFIED | `auth.py`: JWKS, `algorithms=["ES256","RS256"]` fijos, `aud`/`iss`, `require exp,sub,aud,iss`. `test_auth.py`: no header, expired, aud, iss, HS256, alg none, otra clave, sub no UUID, basura = 401; válido devuelve user_id; fuera de allowlist = 403. Prod: `/me` sin token 401, con basura 401 (curl). |
| 3 | Test: recurso ajeno = 404 | VERIFIED | `probe_repo.py` filtra `Probe.id == id, Probe.user_id == user_id`; `test_probes.py::test_other_user_gets_404` pasa. |
| 4 | Anon key no devuelve datos (RLS sin policies) y signups off | VERIFIED | Migración `0001` hace ENABLE RLS en `probes` y `alembic_version`; `test_rls.py` cubre todas las tablas de `public`. 01-02-SUMMARY registra Data API vacía y `signup_disabled` (no re-ejecutado por mí; no hay credenciales que leer). |
| 5 | Deploy free tier, `/health` con SELECT 1, ruff/mypy/pytest limpios | VERIFIED (caveat) | `/health` en Render = `{"status":"ok"}`; frontend en Workers = 200. Corrí: pytest 19 passed, ruff limpio, vitest 10 passed, `mypy app` limpio. Caveat: `mypy .` (incluye tests) da 1 error en `tests/test_auth.py:49` (`jwt.encode(..., None, "none")`); el código de producción está limpio. |

## Requirements Coverage

| Req | Estado | Evidencia |
|-----|--------|-----------|
| AUTH-01 | SATISFIED | LoginPage + aprobación del usuario |
| AUTH-02 | SATISFIED parcialmente | Recarga/reinicio de navegador verificados; "PWA instalada" diferida a Phase 7 (decisión del usuario), no verificable hoy |
| AUTH-03 | SATISFIED | logout en `ProtectedLayout` (todas las pantallas protegidas) |
| AUTH-04 | SATISFIED | `auth.py` + tests + curl en prod |
| AUTH-05 | SATISFIED en código/tests | `get_probe` con user_id + test 404. **REQUIREMENTS.md aún lo muestra `[ ]`/Pending: desactualizado, hay que marcarlo Complete.** |
| AUTH-06 | SATISFIED | RLS + test; signups off (SUMMARY 01-02) |
| AUTH-07 | SATISFIED | `RecoverPage.tsx`: `resetPasswordForEmail` -> `verifyOtp(type:'recovery')` -> `updateUser`; usuario aprobó e2e local con OTP de 6 dígitos |

Los 7 IDs aparecen en los frontmatter de los PLANs (01: 04,05,06; 02: 04,06,07; 03: 01,02,03; 04: 07,01,02,03; 05: 06,04; 06: 01-04) y en REQUIREMENTS.md; ninguno huérfano.

## Code review (01-REVIEW.md, 0 críticos, 5 warnings)

Ninguno bloquea el goal de Phase 1 (no hay endpoints de escritura aún):
- WR-01 (commit post-respuesta): latente; **debe corregirse antes de los endpoints de escritura de Phase 3**.
- WR-02 (JWKS caído = 401 y UI dice "sin acceso"), WR-03 (barra final en SUPABASE_URL), WR-04 (VITE_API_URL sin validar), WR-05 (códigos Supabase no mapeados se muestran como error de red): robustez/UX, no seguridad.

## Anti-patterns

Sin TBD/FIXME/XXX en `backend/app`, `backend/tests`, `frontend/src`.

## Spot-checks ejecutados

curl prod: `/health` ok, `/me` 401 (sin token y con basura), `/login` 200. pytest 19/19, ruff ok, vitest 10/10, `mypy app` ok, `mypy .` 1 error (tests).

## Gaps Summary

Sin gaps bloqueantes; el goal se cumple. Pendientes menores: (1) marcar AUTH-05 Complete en REQUIREMENTS.md; (2) arreglar el error de mypy en `tests/test_auth.py:49` (por ejemplo `# type: ignore[arg-type]`) para que SC5 sea literal con `mypy .`; (3) AUTH-02 en PWA instalada queda para Phase 7; (4) resolver WR-01 antes de Phase 3.

_Verifier: Claude (gsd-verifier)_
