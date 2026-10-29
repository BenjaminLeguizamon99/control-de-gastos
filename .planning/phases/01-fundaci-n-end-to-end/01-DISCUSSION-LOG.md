# Phase 1: Fundación end-to-end - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-29
**Phase:** 1-Fundación end-to-end
**Areas discussed:** Hosting y deploy, Tu cuenta y recuperación, Entorno local y aprendizaje
**Not selected:** Pantalla de login sin diseño (→ Claude's discretion)

---

## Hosting y deploy

| Pregunta | Opciones | Elegida |
|---|---|---|
| Host del backend | Render free + ping / Google Cloud Run / Decidí vos | Render free + ping |
| Repo y deploy | GitHub + deploy en cada push / GitHub + CI con tests antes / Deploy manual | GitHub + deploy en cada push |
| Visibilidad | Privado / Público | Público |
| Proyectos Supabase | Uno solo / Dos: dev y prod | Uno solo |
| Keep-alive | cron-job.org / GitHub Actions schedule / Decidí vos | cron-job.org |

## Tu cuenta y recuperación

| Pregunta | Opciones | Elegida |
|---|---|---|
| Creación de cuenta | Desde el dashboard / Registro en la app y después se apaga | Desde el dashboard |
| Recuperar contraseña | Desde el dashboard / "Olvidé mi contraseña" en la app | "Olvidé mi contraseña" en la app |
| Allowlist backend | Sí, ALLOWED_USER_IDS / No | Sí |
| Duración de sesión | Siempre hasta logout / Expira tras X días | Siempre hasta logout |
| Recuperación: alcance | Sumarlo a Fase 1 (AUTH-07) / Diferir | Sumarlo a Fase 1 |

**Notes:** La recuperación en la app era una capacidad nueva; el usuario eligió agregarla como AUTH-07 a la Fase 1. Se usa código OTP de 6 dígitos en vez de link para no salir de la PWA en iOS. REQUIREMENTS.md y ROADMAP.md actualizados (42 requisitos).

## Entorno local y aprendizaje

| Pregunta | Opciones | Elegida |
|---|---|---|
| Docker | Sí / No pero lo instalo / No y no quiero | Sí, tengo Docker |
| Explicaciones Python | Archivo de notas por fase / Comentarios en código / Ambos | Archivo de notas por fase |
| Quién escribe | Claude escribe, vos revisás / Vos escribís partes clave | Claude escribe, vos revisás |
| Python y uv | Ninguno / Solo Python / Ambos | Ninguno |

**Notes:** Verificación en la máquina: Python 3.13.2 sí está instalado; falta uv. Node 22.14, git y Docker 28 presentes; gh CLI ausente.

## Claude's Discretion

- Pantalla de login mínima (se reestiliza en Fase 2), estructura exacta de carpetas, 401 vs 403 para usuario fuera de allowlist, contenido de la pantalla de prueba.

## Deferred Ideas

- CI con GitHub Actions antes del deploy.
- Expiración de sesión por inactividad.
