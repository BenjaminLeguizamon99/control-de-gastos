---
phase: 2
slug: direcci-n-visual-y-sistema-de-dise-o
status: draft
nyquist_compliant: true
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

- **After every task commit:** Run `npx vitest run` + the 3 greps G1–G3 (defined in 02-01-PLAN.md `<context>`, = RESEARCH Pitfall 4)
- **After every plan wave:** Run `npm test && npm run lint && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 01 | 1 | DIS-02 | T-02-SC | Package checked before install | checkpoint | `npm view @fontsource-variable/recursive@5.3.0 version` | n/a | ⬜ pending |
| 02-01-T2 | 01 | 1 | DIS-01, DIS-02 | T-02-01 | Font self-hosted, no CDN | build + static | `npm run build && ls dist/assets/*.woff2`; G3 empty; DESIGN.md 9 `## ` | n/a | ⬜ pending |
| 02-01-T3 | 01 | 1 | DIS-02 | T-02-02 | N/A | static + build | G1 + G2 empty; `npm test && npm run lint && npm run build` | n/a | ⬜ pending |
| 02-02-T1 | 02 | 2 | DIS-02 | T-02-06 | Amounts never parsed to float | unit (RED) | `npx vitest run src/lib/money.test.ts` must fail | ❌ W0 (created here) | ⬜ pending |
| 02-02-T2 | 02 | 2 | DIS-02 | T-02-04, T-02-07 | Invalid input rejected before Intl; /muestra without auth/API | unit (GREEN) + static | `npx vitest run src/lib/money.test.ts`; grep no `useAuth/useQuery/api(` in MuestraPage | ✅ after T1 | ⬜ pending |
| 02-02-T3 | 02 | 2 | DIS-02 | T-02-05 | Input emits string, never number | static + build | `npm test && npm run build`; DESIGN.md 10 `## ` | n/a | ⬜ pending |
| 02-03-T1 | 03 | 3 | DIS-02 | — | N/A | static + build | G2 empty; no `bg-cat-${`; `npm run build` | n/a | ⬜ pending |
| 02-03-T2 | 03 | 3 | DIS-02 | T-02-09 | Native dialog focus trap | static + build | G1–G3 empty; `grep showModal()`; `npm run build` | n/a | ⬜ pending |
| 02-04-T1 | 04 | 4 | DIS-01, DIS-02 | T-02-12 | Screenshots outside repo | full suite + manual (skill review) | `npm test && npm run lint && npm run build`; G1–G3; DESIGN.md 11 `## ` | n/a | ⬜ pending |
| 02-04-T2 | 04 | 4 | DIS-01 (SC4) | T-02-11 | Commits reviewed before push | checkpoint:human-verify | `git log origin/main..HEAD --oneline` empty | n/a | ⬜ pending |

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [ ] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
