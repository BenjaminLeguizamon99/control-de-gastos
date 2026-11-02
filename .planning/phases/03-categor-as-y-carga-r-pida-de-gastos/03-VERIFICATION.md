---
phase: 03-categor-as-y-carga-r-pida-de-gastos
verified: 2026-11-02T00:00:00Z
status: passed
score: 5/5 roadmap truths verified (plan must-haves spot-checked against code)
overrides_applied: 0
---

# Phase 3 Verification

**Goal:** El usuario carga un gasto desde el celular en segundos, con categorias precargadas que puede ampliar y renombrar.
**Result:** Goal achieved. One advisory defect (CR-01) noted as a warning.

## Truths (code evidence, not SUMMARY)

| Truth | Status | Evidence |
|---|---|---|
| 7 base categories seeded once, Otros fallback (CAT-01) | VERIFIED | `category_service.BASE` has 7 entries with distinct colors 1,5,3,7,2,6,10, Otros `is_fallback=True`. `ensure_seeded` uses `on_conflict_do_nothing`. |
| Name uniqueness enforced by DB (D-15) | VERIFIED | Migration 0002 creates the index on `lower(btrim(name) COLLATE pg_c_utf8)`. Service maps `uq_categories_user_name` to 409. |
| Create and rename categories (CAT-02/03) | VERIFIED | Service has create/update with `_flush_or_409`. Frontend has `CategoriaSheet`, `CategoriasPage`, and the route `/categorias`. |
| Expense saved as integer cents plus 1 installment, period = day 1 of the chosen date (GAS-09, D-21) | VERIFIED | `create_expense` builds `Installment(period=data.date.replace(day=1))`. `amount_cents` is strict int > 0. No `date.today()` in the backend. |
| Foreign category gives 404, `user_id` in body gives 422, credit gives 422 (D-20) | VERIFIED | The 404 is raised in the service. `extra="forbid"`. `payment_method: Literal["debit","cash"]`. |
| Same id twice does not duplicate | VERIFIED | `create_expense` returns the existing row for a known id (see CR-01 caveat). |
| `last-payment-method` falls back to debit (D-19) | VERIFIED | Service returns `... or "debit"`. Route is declared before any `/expenses/{id}`. |
| Quick-entry form (GAS-01..06) | VERIFIED | `NuevoGastoPage` is routed at `/gasto/nuevo`. Validation focuses the first invalid field. `onSuccess` shows the toast, clears amount/category/description, keeps method and date, rotates `draftId`, and remounts the amount input via `montoKey`. `hoyART` is used for the default date. |
| GAS-04 partial (Debito/Efectivo only) | VERIFIED (intended) | Credit is hidden by design (D-20). Phase 4 completes it. |
| RLS on new tables, migration applied, deploy | VERIFIED (per orchestrator evidence) | Migration enables RLS on all three tables. Orchestrator confirmed prod curl, alembic=0002, and the 12-step real-phone UAT. |

## Requirements coverage

All 10 IDs are claimed by plans and mapped to Phase 3 in REQUIREMENTS.md. No orphans. CAT-04, GAS-07 and GAS-08 belong to Phase 6.

| ID | Status |
|---|---|
| CAT-01, CAT-02, CAT-03 | SATISFIED |
| GAS-01, GAS-02, GAS-03, GAS-05, GAS-06, GAS-09 | SATISFIED |
| GAS-04 | SATISFIED for Phase 3 scope (Credito deferred to Phase 4 per D-20) |

## Anti-patterns

No TBD/FIXME/XXX markers in `backend/app` or `frontend/src`.

## Warnings

- **CR-01 (confirmed in code):** `create_expense` returns the existing row for a reused id without comparing payloads. `draftId` rotates only in `onSuccess`. If the response is lost, the user edits the form and retries, so the server returns the old row with 201 and the toast shows the new value. This is silent data loss in an edge case. It does not violate any must-have, because the "same id twice leaves 1 expense" truth holds. Recommend a small follow-up fix: return 409 on payload mismatch, or rotate `draftId` when the form changes after an error.
- Housekeeping: REQUIREMENTS.md traceability still marks the Phase 3 IDs as "Pending" and the checkboxes are unticked. Update them (GAS-04 stays partial).

## Human verification

None outstanding. The user already approved the real-phone UAT.

Not checked: I did not re-run the test suites or probes (the orchestrator supplied those results). I did not read every frontend component in full.
