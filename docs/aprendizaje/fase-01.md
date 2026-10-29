# Fase 1: Python para alguien que viene de Java

Cada concepto: qué es, a qué se parece en Java y dónde está en el código.

## uv, pyproject.toml y uv.lock

- **Qué es:** uv maneja la versión de Python, el entorno virtual (`.venv/`) y las dependencias. `pyproject.toml` declara las dependencias y la config de las herramientas (ruff, mypy, pytest); `uv.lock` fija las versiones exactas resueltas.
- **Java:** Maven/Gradle + wrapper. `pyproject.toml` ≈ `pom.xml`, `uv.lock` ≈ un lockfile de Gradle. `.venv/` ≈ el classpath local del proyecto.
- **Dónde:** `backend/pyproject.toml`, `backend/uv.lock`. En Render, `uv sync --frozen --no-dev` instala exactamente lo del lock, sin dependencias de dev.

## Módulos y paquetes

- **Qué es:** cada archivo `.py` es un módulo; una carpeta con `__init__.py` es un paquete. `from app.db import get_session` importa un nombre de un módulo.
- **Java:** paquete ≈ package, módulo ≈ una clase/archivo. No hace falta una clase por archivo: un módulo puede exportar funciones sueltas.
- **Dónde:** `backend/app/__init__.py`, `backend/app/routers/`, `backend/app/models/`.

## Type hints + mypy strict

- **Qué es:** las anotaciones (`def get_probe(...) -> Probe | None`) no se chequean al ejecutar; mypy las verifica antes, como un compilador.
- **Java:** los tipos de Java, pero verificados por una herramienta aparte. `Probe | None` ≈ `Optional<Probe>`. Con `strict = true` toda función tiene que estar tipada.
- **Dónde:** `[tool.mypy]` en `backend/pyproject.toml`; se corre con `uv run mypy app`.

## Inyección con `Annotated[..., Depends()]`

- **Qué es:** FastAPI mira los parámetros del endpoint y, si tienen `Depends(f)`, llama a `f` y pasa el resultado. Las dependencias pueden depender de otras (el token depende de `HTTPBearer`, el cliente JWKS de `get_jwks_client`).
- **Java:** `@Autowired` / inyección por constructor, pero por request y con funciones en vez de beans. `CurrentUserId` es un alias reutilizable, como un parámetro `@AuthenticationPrincipal`.
- **Dónde:** `backend/app/auth.py` (`CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]`), usado en `backend/app/routers/me.py` y `probes.py`.

## pydantic-settings

- **Qué es:** una clase `BaseSettings` cuyos campos se leen de variables de entorno o de `.env`, con validación de tipos al arrancar (`allowed_user_ids: list[UUID]` se parsea desde JSON).
- **Java:** `@ConfigurationProperties` de Spring Boot. Si falta una variable, falla al inicio y no en el primer request.
- **Dónde:** `backend/app/config.py`.

## Modelos Pydantic

- **Qué es:** clases que validan y serializan datos de entrada/salida. El tipo de retorno del endpoint define el JSON de respuesta.
- **Java:** `record` + Bean Validation (`@Valid`). `ProbeRead.model_validate(probe, from_attributes=True)` ≈ mapear una entidad a DTO.
- **Dónde:** `MeResponse` en `backend/app/routers/me.py`, `ProbeRead` en `backend/app/routers/probes.py`.

## SQLAlchemy 2.0 sync: `Mapped`, `select()`, `Session`

- **Qué es:** el ORM. `Mapped[UUID] = mapped_column(...)` declara columnas; `select(Probe).where(...)` arma la query; `session.scalar(...)` devuelve un objeto o `None`.
- **Java:** JPA/Hibernate. La clase con `__tablename__` ≈ `@Entity`, `Session` ≈ `EntityManager`, `select()` ≈ Criteria API. El repositorio siempre filtra por `user_id`.
- **Dónde:** `backend/app/models/probe.py`, `backend/app/repositories/probe_repo.py`.

## `get_session` con `session.begin()`

- **Qué es:** abre una sesión y una transacción por request: si el endpoint termina bien hace commit, si tira excepción hace rollback.
- **Java:** `@Transactional` sobre el método del controller/servicio, una transacción por request.
- **Dónde:** `backend/app/db.py`.

## Generadores con `yield`

- **Qué es:** una función con `yield` entrega un valor y se pausa; cuando se retoma, sigue después del `yield`. FastAPI usa eso para "antes del request / después del request". El `with` cierra los recursos aunque haya error.
- **Java:** try-with-resources (`try (var s = open()) { ... }`): el código después del `yield` es el `close()`.
- **Dónde:** `get_session` en `backend/app/db.py`, el fixture `client` en `backend/tests/conftest.py`.

## Alembic y RLS en la misma migración

- **Qué es:** migraciones versionadas en Python (`upgrade()`/`downgrade()`), aplicadas con `alembic upgrade head`. La tabla `alembic_version` guarda cuál se aplicó.
- **Java:** Flyway (o Liquibase). `alembic_version` ≈ `flyway_schema_history`.
- **Por qué RLS en la misma migración:** Supabase expone las tablas de `public` por su Data API. Si la tabla se crea sin `ENABLE ROW LEVEL SECURITY`, existe un momento en que es legible con la publishable key. Al hacerlo en la misma migración nunca queda abierta; sin policies, nadie entra por la Data API y el backend entra como `postgres`.
- **Dónde:** `backend/alembic/versions/0001_probes_rls.py`, `backend/alembic/env.py` (la URL sale de `get_settings()`, no de `alembic.ini`), test `backend/tests/test_rls.py`.

## `lru_cache`

- **Qué es:** memoriza el resultado de una función. Sin argumentos, la primera llamada crea el objeto y las siguientes devuelven el mismo.
- **Java:** un bean singleton. Además, como es una función, el test la puede reemplazar.
- **Dónde:** `get_settings()` en `backend/app/config.py`, `get_jwks_client()` en `backend/app/auth.py` (el cliente JWKS cachea las claves de Supabase).

## Fixtures de pytest y `dependency_overrides`

- **Qué es:** un fixture es una función que prepara algo; el test lo pide por nombre de parámetro. `scope="session"` corre una vez para toda la suite. `app.dependency_overrides[get_jwks_client] = FakeJWKS` reemplaza una dependencia en los tests.
- **Java:** `@BeforeEach`/`@BeforeAll` + `@MockBean`. Ojo: solo se reemplaza la descarga de claves; `jwt.decode` corre de verdad, con una clave generada en el test.
- **Dónde:** `backend/tests/conftest.py`. Al principio fuerza las env vars y tiene un `assert` que impide correr los tests contra algo que no sea `localhost` (los fixtures hacen `TRUNCATE`).

## Por qué `def` y no `async def`

- **Qué es:** FastAPI corre los endpoints `def` en un threadpool, así que una llamada bloqueante (SQLAlchemy sync, psycopg) no traba el servidor. Dentro de un `async def`, esa misma llamada bloquearía el event loop entero.
- **Java:** `def` ≈ el modelo clásico de un thread por request (Spring MVC); `async def` ≈ WebFlux. Para un usuario no hay diferencia de rendimiento, y sync es más parecido a JPA y más fácil de depurar. Además psycopg async en Windows necesita otra event loop policy.
- **Dónde:** todos los routers en `backend/app/routers/`.
