# Fase 3: clases, modelos y capas

Cada concepto: qué es, a qué se parece en Java y dónde está en el código de esta fase.

## Clases y POO en Python

- **Qué es:** `class Category(Base):` declara una clase que hereda de `Base`. Los métodos reciben la instancia como primer parámetro explícito, `self`, y el constructor es `__init__`. En los modelos no escribimos `__init__`: SQLAlchemy genera uno que acepta los campos como argumentos con nombre (`Category(user_id=..., name=...)`).
- **Java:** `class Category extends Base`. `self` ≈ `this`, pero hay que escribirlo siempre. No hay `private`/`public`: por convención, un nombre que empieza con `_` (como `_flush_or_409`) es interno del módulo.
- **Dónde:** `backend/app/models/base.py` (`class Base(DeclarativeBase)`), `backend/app/models/category.py`.

## Dataclasses vs modelos

- **Qué es:** `@dataclass` genera `__init__`, `__eq__` y `__repr__` a partir de los campos anotados. Acá no hace falta: los modelos SQLAlchemy y los modelos Pydantic ya generan su propio constructor, y además mapean a la tabla o validan el JSON.
- **Java:** una dataclass ≈ un `record`. El modelo SQLAlchemy ≈ una `@Entity`; el modelo Pydantic ≈ un `record` DTO con Bean Validation.
- **Dónde:** no hay dataclasses en el proyecto; el rol lo cumplen `backend/app/models/` (entidades) y `backend/app/schemas/` (DTOs).

## Modelos SQLAlchemy 2.0: `Mapped`, `mapped_column`, `relationship`

- **Qué es:** `name: Mapped[str]` declara una columna `NOT NULL`; `Mapped[str | None]` la hace nullable. `mapped_column(...)` agrega detalles (tipo SQL, `ForeignKey`, `server_default`). `relationship(cascade="all, delete-orphan")` carga y guarda la lista de cuotas junto con el gasto.
- **Java:** entidades JPA. `Mapped[...]` ≈ un campo con `@Column`, `ForeignKey` ≈ `@JoinColumn`, `relationship(cascade=...)` ≈ `@OneToMany(cascade = ALL, orphanRemoval = true)`.
- **Dónde:** `backend/app/models/category.py`, `backend/app/models/expense.py` (`Expense.installments`).

## `select()`, `Session` y `flush()` vs commit

- **Qué es:** `select(Category).where(...)` arma la query y `session.scalar`/`session.scalars` la ejecuta. `session.add(obj)` solo lo registra; `session.flush()` manda el `INSERT`/`UPDATE` a la DB dentro de la transacción abierta, sin commitear. El commit lo hace `get_session` al terminar el request.
- **Java:** `Session` ≈ `EntityManager`, `select()` ≈ Criteria API, `flush()` ≈ `EntityManager.flush()`, y el commit al final ≈ `@Transactional` sobre el request. Se hace `flush()` explícito para que un error de la DB salte dentro del service, donde lo podemos traducir, y no en el commit (que daría 500).
- **Dónde:** `backend/app/repositories/category_repo.py`, `_flush_or_409` en `backend/app/services/category_service.py`, `backend/app/db.py`.

## Modelos Pydantic de request: `strict`, `extra="forbid"`, `Field`, `Annotated`, `AfterValidator`

- **Qué es:** `CategoryIn` valida el body. `extra="forbid"` rechaza campos de más (un `is_fallback` o `user_id` contrabandeado da 422). `strict=True` no convierte tipos (`"3"` no pasa como `3`). `Field(ge=1, le=10)` pone límites, `Annotated[str, StringConstraints(...)]` recorta espacios y limita el largo, y `AfterValidator(_one_emoji)` corre una función propia después de la validación de tipo.
- **Java:** un DTO con Bean Validation: `Field(ge=1, le=10)` ≈ `@Min(1) @Max(10)`, `StringConstraints` ≈ `@NotBlank @Size(max=40)`, `AfterValidator` ≈ un `ConstraintValidator` propio, y el endpoint que lo recibe ≈ `@Valid @RequestBody`.
- **Dónde:** `backend/app/schemas/category.py` (`CategoryIn`), `backend/app/schemas/expense.py` (`ExpenseCreate`, con strict por campo).

## Capas router -> service -> repository

- **Qué es:** el router recibe HTTP y arma la respuesta, el service tiene las reglas (sembrar antes de crear, 404, 409) y el repository hace las queries, siempre filtrando por `user_id`. Son funciones de módulo, no clases: el módulo ya es el "singleton".
- **Java:** `@RestController` -> `@Service` -> `@Repository`, pero sin beans ni inyección: el router importa la función del service directamente. La sesión sí llega por inyección (`SessionDep`).
- **Dónde:** `backend/app/routers/categories.py` -> `backend/app/services/category_service.py` -> `backend/app/repositories/category_repo.py`.

## `Literal` y `Enum`

- **Qué es:** `Literal["debit", "cash"]` dice que el valor tiene que ser exactamente uno de esos strings; Pydantic lo valida y mypy lo chequea. En la DB, `payment_method` es un `text` con un `CHECK` que ya acepta `'credit'`; la API lo habilita recién en la Fase 4 cambiando solo el `Literal`. No usamos un enum de Postgres porque cambiar sus valores exige `ALTER TYPE` y es más incómodo de migrar que un `CHECK`.
- **Java:** un `enum PaymentMethod { DEBIT, CASH }` con `@Enumerated(EnumType.STRING)`. `Literal` es más liviano: no hay clase, son strings tipados.
- **Dónde:** `backend/app/schemas/expense.py` (`payment_method: Literal["debit", "cash"]`).

## La trampa de `import datetime as dt`

- **Qué es:** si el modelo tiene un campo llamado `date` y además se importa `from datetime import date`, dentro de la clase el nombre `date` queda tapado por el campo y la anotación deja de apuntar al tipo. Importar el módulo como `dt` y escribir `dt.date` lo evita. Lo mismo pasa con el campo `emoji` y el paquete `emoji`, por eso se importa como `emoji_lib`.
- **Java:** no existe ese problema porque tipos y campos viven en espacios de nombres distintos; en Python un nombre es un solo nombre.
- **Dónde:** `backend/app/models/expense.py`, `backend/app/schemas/expense.py`, `import emoji as emoji_lib` en `backend/app/schemas/category.py`.

## `IntegrityError` -> 409

- **Qué es:** el índice único `uq_categories_user_name` (nombre recortado y en minúsculas, por usuario) decide si un nombre está repetido. `_flush_or_409` hace `flush()` dentro de `try`, captura `IntegrityError`, mira si la causa es `UniqueViolation` de ese índice y la traduce a `HTTPException(409)`; cualquier otro error se relanza. No hay un `SELECT` previo: dos requests simultáneas igual chocan en la DB.
- **Java:** capturar `DataIntegrityViolationException` en el service (o con un `@ExceptionHandler`) y devolver `409 Conflict`.
- **Dónde:** `backend/app/services/category_service.py`, migración `backend/alembic/versions/0002_categories_expenses.py`.
