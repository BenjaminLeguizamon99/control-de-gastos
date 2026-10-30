# Control de Gastos

App web personal (PWA, mobile first) para cargar gastos en segundos y saber cuánta plata queda en el mes. Un solo usuario, solo ARS.

- `backend/`: FastAPI + SQLAlchemy + Alembic (Python 3.13, uv). Verifica el JWT de Supabase por JWKS.
- `frontend/`: React + TypeScript (Vite). Supabase se usa solo para auth; los datos pasan por el backend.
- Datos y auth: Postgres + Supabase Auth. Deploy: Render (API), Cloudflare Workers con static assets (frontend), cron-job.org (keep-alive).

> **Regla:** nunca commitear `.env`. Nunca poner la secret key / `service_role` de Supabase ni la URL de la DB en el frontend: todo lo `VITE_*` queda público en el JS servido. Si un secreto llega a GitHub, rotarlo en Supabase (DB password o keys) en el momento.

## Requisitos

- Python 3.13 y [uv](https://docs.astral.sh/uv/)
- Node 24 o superior (`frontend/.nvmrc` dice 26)
- Docker (Postgres local para los tests)

## Correr en local

```bash
# Postgres 17 de prueba en el puerto 5433
docker compose up -d --wait db

# Backend
cd backend
cp .env.example .env        # completar con los datos de Supabase (ver abajo)
uv sync
uv run pytest               # los tests usan solo la DB de Docker, nunca Supabase
uv run fastapi dev app/main.py   # http://localhost:8000

# Frontend (otra terminal)
cd frontend
cp .env.example .env        # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_API_URL
npm i
npm run dev                 # http://localhost:5173
```

## Checks de calidad

```bash
cd backend
uv run ruff check .
uv run ruff format --check .
uv run mypy app
uv run pytest

cd ../frontend
npm run build
npm run lint
npx vitest run
```

## Migraciones a Supabase

Se aplican **desde local**, nunca en el build de Render (un deploy roto no puede tocar el schema):

```bash
cd backend
uv run alembic upgrade head     # usa DATABASE_URL de backend/.env
uv run alembic current
```

Toda tabla nueva de `public` lleva `ENABLE ROW LEVEL SECURITY` en la misma migración (sin policies: la Data API queda cerrada y el backend entra como `postgres`).

## Pasos manuales

### 1. Supabase

1. Crear el proyecto en **us-east-1 (N. Virginia)**. Password de la DB **alfanumérica** (un `@`, `#`, `/` o `%` rompe la URL o la config de Alembic).
2. Settings → JWT Keys: confirmar una signing key asimétrica (ECC P-256). Si es legacy HS256, "Migrate JWT secret" → "Rotate keys". Ver el paso de verificación abajo.
3. Authentication → Sign In / Providers: desactivar **"Allow new users to sign up"** (el toggle general, no el del provider Email, que apaga también el login).
4. Authentication → Users → Add user, con tu email y "Auto confirm". Copiar el UUID a `ALLOWED_USER_IDS` (`["<uuid>"]`).
5. **SMTP propio** (Authentication → Emails → SMTP Settings). Sin esto Supabase no deja editar los templates. Con Gmail: host `smtp.gmail.com`, puerto `587`, usuario tu Gmail, password = una **app password de Google** (Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones). Esa app password vive solo en Supabase, nunca en el repo. Bonus: se va el límite de 2 mails/hora del SMTP por defecto.
6. **Email OTP Length = 6** (viene en 8; la pantalla `/recuperar` espera 6 dígitos).
7. Template **"Reset password"**: reemplazar el cuerpo por uno que muestre el código, por ejemplo `<p>Tu código para cambiar la contraseña: <strong>{{ .Token }}</strong></p>`. Sin link: así funciona también en la PWA de iOS.
8. Botón "Connect" → copiar la URI del **Session pooler** (`postgres.<ref>@aws-?-us-east-1.pooler.supabase.com:5432/postgres`), no la conexión directa (es solo IPv6). Convertirla así:
   `postgresql+psycopg://postgres.<ref>:<password>@aws-?-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`
   - Anteponer `+psycopg` al esquema y agregar `?sslmode=require` al final.
   - **Ojo con los corchetes:** al reemplazar `[YOUR-PASSWORD]` hay que borrar también `[` y `]`. Si quedan, da `password authentication failed`.
9. Copiar la publishable key (`sb_publishable_…`) al `.env` del frontend. La secret key no se usa en ningún lado.

**Verificación** (con `SUPABASE_URL` y la publishable key):

```bash
curl -s "$SUPABASE_URL/auth/v1/.well-known/jwks.json"        # keys con "alg":"ES256"
curl -s "$SUPABASE_URL/rest/v1/probes?select=*" -H "apikey: <publishable>"   # PASS: [] o 42501
curl -s -X POST "$SUPABASE_URL/auth/v1/signup" -H "apikey: <publishable>" \
  -H "Content-Type: application/json" \
  -d '{"email":"intruso@example.com","password":"x12345678"}'               # PASS: signup_disabled
```

### 2. Render (backend)

1. New → Blueprint → elegir este repo. Render lee `render.yaml` (servicio `control-de-gastos-api`, free, virginia, `rootDir: backend`).
2. Cargar las variables que pide (`sync: false`, no están en el repo):
   - `DATABASE_URL`: la URI del pooler de arriba.
   - `SUPABASE_URL`: `https://<ref>.supabase.co`, sin barra final.
   - `ALLOWED_USER_IDS`: `["<uuid>"]`.
   - `CORS_ORIGINS`: `["https://control-de-gastos.<tu-subdominio>.workers.dev"]` (origen exacto del frontend, sin barra final).
   - **Ojo:** `ALLOWED_USER_IDS` y `CORS_ORIGINS` son listas y pydantic-settings las lee como **JSON**. Un UUID pelado (sin `["..."]`) hace que el servicio crashee al arrancar.
3. Cada push a `main` redeploya. `GET https://<servicio>.onrender.com/health` debe dar `{"status":"ok"}`.

### 3. Cloudflare Workers (frontend)

El proyecto conectado a Git se crea como **Worker con static assets** (Workers Builds), no como Pages. `frontend/wrangler.jsonc` le dice que sirva `./dist` y mande cualquier ruta a `index.html` (SPA).

1. Workers & Pages → Create → conectar el repo.
2. Settings → Build: Root directory `frontend`, build command `npm run build`, deploy command `npx wrangler deploy --config wrangler.jsonc`. Sin `--config`, la auto-config de wrangler ignora el archivo y publica la carpeta fuente cruda.
3. Settings → Build → Variables and secrets (variables de **build**, no de runtime): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL` (`https://<servicio>.onrender.com`, sin barra final) y `NODE_VERSION=26`.
4. URL resultante: `https://control-de-gastos.<tu-subdominio>.workers.dev`. Ponerla en `CORS_ORIGINS` de Render.
5. En Supabase → Authentication → URL Configuration, poner esa URL como Site URL.

### 4. cron-job.org (keep-alive)

Render free se duerme a los 15 min sin tráfico. Crear un job `GET https://<servicio>.onrender.com/health` **cada 10 minutos**. Las 750 h/mes del plan free alcanzan para 24/7.

## Notas de aprendizaje

`docs/aprendizaje/` explica los conceptos de Python de cada fase con analogías Java.
