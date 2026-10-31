import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { FONDO, type Categoria } from '../../components/ui/CategoryGrid'
import { NETWORK_ERROR } from '../auth/authErrors'
import { CategoriaSheet } from './CategoriaSheet'
import { useCategorias } from './useCategorias'

const linkClass =
  'inline-flex min-h-11 items-center py-2 text-etiqueta font-normal text-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento'

// Solo crear y editar; el resto llega en la Fase 6
export function CategoriasPage() {
  const categorias = useCategorias()
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [apertura, setApertura] = useState(0)

  function abrir(c: Categoria | null) {
    setEditando(c)
    setApertura((n) => n + 1)
    setAbierto(true)
  }

  return (
    <main className="mx-auto max-w-120 px-4 pb-24 sm:px-6">
      <Link to="/" className={linkClass}>
        Volver
      </Link>
      <h1 className="mb-6 text-titulo font-casual">Categorías</h1>
      <Button variant="secundario" fullWidth onClick={() => abrir(null)}>
        Nueva categoría
      </Button>

      <div className="mt-8">
        {categorias.isError ? (
          <>
            <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
              {NETWORK_ERROR}
            </p>
            <Button variant="secundario" onClick={() => categorias.refetch()}>
              Reintentar
            </Button>
          </>
        ) : !categorias.data ? (
          <p className="text-etiqueta font-normal text-tinta-2">Cargando categorías…</p>
        ) : categorias.data.length === 0 ? (
          <>
            <h2 className="mb-2 text-cuerpo font-semibold">Todavía no tenés categorías</h2>
            <p className="text-etiqueta font-normal text-tinta-2">
              Esto no debería pasar. Tocá "Nueva categoría" para crear la primera.
            </p>
          </>
        ) : (
          <ul>
            {categorias.data.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-label={`Editar ${c.nombre}`}
                  onClick={() => abrir(c)}
                  className="flex min-h-14 w-full items-center gap-4 border-b border-linea py-2 text-left active:bg-papel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-control text-emoji ${FONDO[c.color]}`}
                  >
                    {c.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-cuerpo">{c.nombre}</span>
                  <span className="text-etiqueta font-normal text-tinta-2">Editar</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CategoriaSheet
        key={apertura}
        open={abierto}
        onClose={() => setAbierto(false)}
        categorias={categorias.data ?? []}
        editando={editando}
        onGuardada={() => {}}
      />
    </main>
  )
}
