---
phase: 2
slug: direcci-n-visual-y-sistema-de-dise-o
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-30
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^5.0.5 (`environment: 'node'`) |
| **Config file** | `frontend/vite.config.ts` (`include: ['src/**/*.test.ts']`) |
| **Quick run command** | `cd frontend && npx vitest run src/lib/money.test.ts` |
| **Full suite command** | `cd frontend && npm test && npm run lint && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` + the 3 Pitfall-4 greps from 02-RESEARCH.md
- **After every plan wave:** Run `npm test && npm run lint && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (planner) | — | — | DIS-02 | — | Amounts never parsed to float; invalid input rejected before Intl | unit | `npx vitest run src/lib/money.test.ts` | ❌ W0 | ⬜ pending |
| TBD (planner) | — | — | DIS-02 | — | N/A | static | 3 Pitfall-4 greps return empty | n/a | ⬜ pending |
| TBD (planner) | — | — | DIS-02 | — | N/A | build | `npm run build && ls dist/assets/*.woff2` | n/a | ⬜ pending |
| TBD (planner) | — | — | DIS-02 | — | N/A | static | `test -f DESIGN.md && grep -c "^## " DESIGN.md` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/lib/money.test.ts` — formatMonto, parseMontoInput, estadoRestante (DIS-02)

*Framework: already installed (Vitest). No jsdom / testing-library.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual direction is non-generic, made with `frontend-design` | DIS-01 | Aesthetic judgment | Skill self-review on `/muestra` screenshots at 360/390/768/1280, light + dark |
| Looks right on real phone + desktop; theme follows system without reload; no horizontal scroll | SC4 | Real device | `checkpoint:human-verify`: open `/muestra` on the deploy |
| BottomSheet focus/Escape/backdrop, segmented control keyboard | DIS-02 | Native browser behavior; jsdom would test the mock | Manual pass on `/muestra` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
