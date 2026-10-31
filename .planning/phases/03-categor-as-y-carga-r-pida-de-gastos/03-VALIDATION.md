---
phase: 3
slug: categor-as-y-carga-r-pida-de-gastos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-31
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.2 (backend, Postgres 17 en Docker) · Vitest 5 (frontend, `environment: 'node'`) |
| **Config file** | `backend/pyproject.toml` · `frontend/vite.config.ts` |
| **Quick run command** | `cd backend && uv run pytest -x -q` · `cd frontend && npm test` |
| **Full suite command** | backend: `uv run pytest && uv run ruff check . && uv run mypy app` · frontend: `npm test && npm run lint && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command of the side touched
- **After every plan wave:** Run both full suites
- **Before `/gsd:verify-work`:** Full suite green + migración en Supabase + curl anon + UAT en celular
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Requirement-level map (from RESEARCH.md § Validation Architecture). The planner assigns task IDs.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| CAT-01 | Siembra de 7 (incl. Otros `is_fallback`), idempotente y concurrente | integration | `pytest tests/test_categories.py -k seed -x` | ❌ W0 | ⬜ pending |
| CAT-02 | Crear 201; duplicado trim/case/acentos → 409; emoji inválido → 422; color 11 → 422 | integration | `pytest tests/test_categories.py -k create -x` | ❌ W0 | ⬜ pending |
| CAT-03 | Renombrar; nombre existente → 409; id ajeno → 404 | integration | `pytest tests/test_categories.py -k rename -x` | ❌ W0 | ⬜ pending |
| GAS-01 | POST /expenses válido 201; categoría ajena 404; montos inválidos y `credit` → 422 | integration | `pytest tests/test_expenses.py -x` | ❌ W0 | ⬜ pending |
| GAS-09 | 123456 centavos ida y vuelta + 1 installment igual | integration + unit | `pytest tests/test_expenses.py -k cents -x` · `npm test -- money` | ❌ W0 / ✅ | ⬜ pending |
| GAS-05 | `hoyART` (día 31 22:30 ART) y período = día 1 del mes de la fecha | unit + integration | `npm test -- fecha` · `pytest tests/test_expenses.py -k period -x` | ❌ W0 | ⬜ pending |
| GAS-04 | Último medio: ninguno → debit; el más reciente gana | integration | `pytest tests/test_expenses.py -k last_payment -x` | ❌ W0 | ⬜ pending |
| GAS-06 | Mismo `id` dos veces → 1 gasto | integration | `pytest tests/test_expenses.py -k idempotent -x` | ❌ W0 | ⬜ pending |
| D-08/D-13 | Orden (Otros al final, acentos) y color menos usado | unit | `npm test -- categorias` | ❌ W0 | ⬜ pending |
| api | `api()` con método/body y reintento en 401 | unit | `npm test -- client` | ✅ extend | ⬜ pending |
| SC5 | RLS en todas las tablas `public` | integration | `pytest tests/test_rls.py` | ✅ | ⬜ pending |
| CORS | Preflight POST/PUT permitido | integration | `pytest tests/test_cors.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/conftest.py` — TRUNCATE incluye categories, expenses, installments
- [ ] `backend/tests/test_categories.py`, `backend/tests/test_expenses.py`, `backend/tests/test_cors.py`
- [ ] `frontend/src/lib/fecha.test.ts`, `frontend/src/lib/categorias.test.ts`; extender `money.test.ts` y `client.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| curl anon a `/rest/v1/{categories,expenses,installments}` → `[]` | SC5 | Requiere el proyecto Supabase real | `curl https://<ref>.supabase.co/rest/v1/expenses -H "apikey: <publishable>"` |
| `pg_c_utf8` existe en Supabase antes de migrar | CAT-02 | Requiere la DB real | `SELECT 1 FROM pg_collation WHERE collname='pg_c_utf8';` |
| Teclado numérico, autofocus, grilla, toast y reseteo del form | GAS-02/03/06 | Comportamiento en celular real | Cargar 2 gastos seguidos desde el celu en el deploy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
