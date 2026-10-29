---
phase: 01-fundaci-n-end-to-end
plan: 04
subsystem: frontend-auth
tags: [frontend, supabase-auth, otp, password-recovery, e2e-verification]
requires: ["01-02", "01-03"]
provides:
  - "/recuperar: resetPasswordForEmail -> verifyOtp(type 'recovery') + updateUser, sin guard de sesión"
  - "Link 'Olvidé mi contraseña' en /login"
  - "Flujo de auth de la fase verificado a mano contra Supabase real y backend local"
affects: [01-05]
tech-stack:
  added: []
  patterns: ["paso del flujo como estado local (step 1|2)", "flag verified para reintentar solo updateUser"]
key-files:
  created:
    - frontend/src/features/auth/RecoverPage.tsx
  modified:
    - frontend/src/features/auth/LoginPage.tsx
    - frontend/src/app/router.tsx
    - frontend/.env (local, gitignored)
decisions:
  - "Supabase usa SMTP propio (Gmail smtp.gmail.com:587, app password guardada solo en Supabase): sin SMTP custom no deja editar el template de recuperación. Ya no aplica el límite de 2 mails/hora del SMTP por defecto"
  - "Email OTP Length = 6 en Supabase (venía en 8) para coincidir con el input maxLength 6"
  - "Password de la DB rotada a alfanumérica (resuelve el riesgo de 01-02); backend/.env actualizado por el usuario"
metrics:
  duration: "~20 min + verificación manual"
  completed: 2026-10-29
---

# Phase 01 Plan 04: Recuperación con OTP y verificación de punta a punta Summary

Pantalla `/recuperar` de 2 pasos (código de 6 dígitos por email, sin link, para que funcione en la PWA de iOS) enlazada desde el login, y verificación manual aprobada de login, persistencia de sesión, logout y recuperación contra Supabase real.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Pantalla /recuperar con código OTP y link desde el login | 8520eab |
| 2 | Verificación local de punta a punta (checkpoint) | aprobado por el usuario (sin código) |

## Verification

- Task 1: `npm run build`, `npm run lint`, `npx vitest run` exit 0; `type: 'recovery'` presente, sin `auth.resend`.
- Task 2: el usuario confirmó los 8 pasos: error de login incorrecto, `/` muestra el `user_id` correcto (aud/iss reales validados por `/me`), F5 y reinicio del navegador mantienen la sesión, logout + guard a `/login`, recuperación con código de 6 dígitos, la contraseña nueva funciona.
- AUTH-01, AUTH-02, AUTH-03, AUTH-07 verificados. AUTH-02 con la PWA instalada se vuelve a mirar en la Fase 7.

## Deviations from Plan

Configuración del dashboard de Supabase durante la verificación (sin cambios de código):

1. **SMTP propio obligatorio para editar templates.** Supabase ya no permite editar los templates de email con su SMTP por defecto. El usuario configuró Gmail (smtp.gmail.com:587, app password de Google guardada solo en Supabase) y recién ahí pudo poner `{{ .Token }}` en el template "Reset password". El README de 01-05 tiene que documentar este paso. El límite de 2 mails/hora ya no aplica.
2. **Email OTP Length venía en 8.** El usuario lo puso en 6 para coincidir con la UI (`maxLength={6}`, zod `/^\d{6}$/`).
3. **Password de la DB rotada** a una alfanumérica; el riesgo abierto en 01-02 queda resuelto. `backend/.env` lo actualizó el usuario (no commiteado).

Notas del executor de Task 1:

- El chequeo de "rebote" del login no necesitó cambios (confirmado por el paso 3 del usuario).
- `resetPasswordForEmail` vive en un único helper `sendCode()` usado por "Enviar código" y "Reenviar código": 1 línea en el grep en vez de las >= 2 del criterio de aceptación. El comportamiento es el mismo.
- `/recuperar` no tiene guard de sesión, como pide el plan (Pitfall 7); el UI-SPEC decía otra cosa, ganó el plan.
- Después de que `verifyOtp` sale bien, el reintento solo llama a `updateUser`.

## Known Stubs

None.

## Next

- `RecoverPage` guarda el paso solo en memoria: si se cierra la pestaña vuelve al paso 1 (al usuario le pasó). No es un defecto para este plan; considerar persistir email/paso en `sessionStorage` si molesta en el celular.
- 01-05: documentar en el README el SMTP propio, el template con `{{ .Token }}` y OTP Length = 6.

## Self-Check: PASSED

- `frontend/src/features/auth/RecoverPage.tsx` existe; commit 8520eab presente en `git log`.
