import { useId, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../../api/client'
import type { CategoryApi, CategoryIn } from '../../api/types'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { NOMBRES_COLOR, SOLIDO, type Categoria, type ColorCategoria } from '../../components/ui/CategoryGrid'
import {
  CATEGORIA_DUPLICADA,
  CATEGORIA_INVALIDA,
  CATEGORIA_RED,
  EMOJI_FALTA,
  EMOJI_INVALIDO,
  EMOJIS,
  NOMBRE_FALTA,
  aCategoria,
  colorMenosUsado,
  esUnEmoji,
  ordenar,
} from '../../lib/categorias'

const inputBase =
  'w-full min-h-12 rounded-control border border-borde bg-papel-2 px-4 text-cuerpo text-tinta placeholder:text-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento'
const errorClass = 'mt-1 text-etiqueta font-normal text-peligro'

// El padre lo monta con un key nuevo por apertura: el estado arranca limpio
export function CategoriaSheet({
  open,
  onClose,
  categorias,
  editando,
  onGuardada,
}: {
  open: boolean
  onClose: () => void
  categorias: Categoria[]
  editando: Categoria | null
  onGuardada: (c: Categoria) => void
}) {
  const queryClient = useQueryClient()
  const emojiName = useId()
  const colorName = useId()
  const nombreId = useId()
  const libreId = useId()
  const nombreRef = useRef<HTMLInputElement>(null)
  const emojisRef = useRef<HTMLDivElement>(null)
  const libreRef = useRef<HTMLInputElement>(null)

  const actual = editando?.emoji ?? ''
  const [nombre, setNombre] = useState(editando?.nombre ?? '')
  const [emojiGrilla, setEmojiGrilla] = useState(EMOJIS.includes(actual) ? actual : '')
  const [libre, setLibre] = useState(EMOJIS.includes(actual) ? '' : actual)
  const [color, setColor] = useState<ColorCategoria>(editando?.color ?? colorMenosUsado(categorias))
  const [errores, setErrores] = useState<{ nombre?: string; emoji?: string }>({})
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  // Con algo escrito en el campo libre, manda el campo libre (D-12)
  const libreLimpio = libre.trim()
  const emoji = libreLimpio ? (esUnEmoji(libreLimpio) ? libreLimpio : '') : emojiGrilla

  const mutation = useMutation({
    mutationFn: (body: CategoryIn) =>
      editando
        ? api<CategoryApi>(`/categories/${editando.id}`, { method: 'PUT', body })
        : api<CategoryApi>('/categories', { method: 'POST', body }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const nuevos: typeof errores = {}
    if (!nombre.trim()) nuevos.nombre = NOMBRE_FALTA
    if (libreLimpio && !emoji) nuevos.emoji = EMOJI_INVALIDO
    else if (!emoji) nuevos.emoji = EMOJI_FALTA
    setErrores(nuevos)
    if (nuevos.nombre) return nombreRef.current?.focus()
    if (nuevos.emoji === EMOJI_INVALIDO) return libreRef.current?.focus()
    if (nuevos.emoji) return emojisRef.current?.querySelector<HTMLInputElement>('input')?.focus()

    setErrorGuardar(null)
    mutation.mutate(
      { name: nombre.trim(), emoji, color },
      {
        onSuccess: (resp) => {
          const cat = aCategoria(resp)
          queryClient.setQueryData<Categoria[]>(['categories'], (old) =>
            ordenar([...(old ?? []).filter((c) => c.id !== cat.id), cat]),
          )
          onGuardada(cat)
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            setErrores({ nombre: CATEGORIA_DUPLICADA })
            nombreRef.current?.focus()
          } else if (err instanceof ApiError && err.status === 422 && err.campoInvalido() === 'emoji') {
            setErrores({ emoji: EMOJI_INVALIDO })
          } else if (err instanceof ApiError && err.status === 422) {
            setErrorGuardar(CATEGORIA_INVALIDA)
          } else {
            setErrorGuardar(CATEGORIA_RED)
          }
        },
      },
    )
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editando ? 'Editar categoría' : 'Nueva categoría'}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor={nombreId} className="mb-2 block text-etiqueta">
            Nombre
          </label>
          <input
            ref={nombreRef}
            id={nombreId}
            type="text"
            maxLength={40}
            autoComplete="off"
            autoFocus={!editando}
            placeholder="Ej.: Farmacia"
            aria-invalid={errores.nombre ? true : undefined}
            aria-describedby={errores.nombre ? `${nombreId}-error` : undefined}
            className={`${inputBase} ${errores.nombre ? 'border-peligro!' : ''}`}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              setErrores((x) => ({ ...x, nombre: undefined }))
            }}
          />
          {errores.nombre && (
            <p id={`${nombreId}-error`} role="alert" className={errorClass}>
              {errores.nombre}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-etiqueta">Emoji</legend>
          <div ref={emojisRef} className="grid grid-cols-6 gap-1">
            {EMOJIS.map((e) => (
              <label
                key={e}
                className="flex size-12 items-center justify-center rounded-control border-2 border-transparent text-emoji has-[:checked]:border-tinta has-[:checked]:bg-papel-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento"
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={emojiName}
                  value={e}
                  checked={emoji === e}
                  onChange={() => {
                    setEmojiGrilla(e)
                    setLibre('')
                    setErrores((x) => ({ ...x, emoji: undefined }))
                  }}
                />
                {e}
              </label>
            ))}
          </div>
          <label htmlFor={libreId} className="mt-2 mb-2 block text-etiqueta">
            Otro emoji
          </label>
          <input
            ref={libreRef}
            id={libreId}
            type="text"
            autoComplete="off"
            placeholder="Tocá acá y usá el teclado de emojis"
            aria-invalid={errores.emoji === EMOJI_INVALIDO ? true : undefined}
            aria-describedby={errores.emoji ? `${libreId}-error` : undefined}
            className={`${inputBase} ${errores.emoji === EMOJI_INVALIDO ? 'border-peligro!' : ''}`}
            value={libre}
            onChange={(e) => {
              setLibre(e.target.value)
              setErrores((x) => ({ ...x, emoji: undefined }))
            }}
          />
          {errores.emoji && (
            <p id={`${libreId}-error`} role="alert" className={errorClass}>
              {errores.emoji}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-etiqueta">Color</legend>
          <div className="grid grid-cols-5 gap-2">
            {NOMBRES_COLOR.map(([n, nombreColor]) => (
              <label
                key={n}
                className="flex size-12 items-center justify-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento"
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={colorName}
                  value={n}
                  checked={color === n}
                  onChange={() => setColor(n)}
                />
                <span
                  aria-hidden="true"
                  className={`flex size-10 items-center justify-center rounded-full text-etiqueta font-semibold text-papel ${SOLIDO[n]} ${color === n ? 'outline-2 outline-offset-2 outline-tinta' : ''}`}
                >
                  {color === n && '✓'}
                </span>
                <span className="sr-only">{nombreColor}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-2">
          {errorGuardar && (
            <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
              {errorGuardar}
            </p>
          )}
          <Button variant="primario" type="submit" fullWidth loading={mutation.isPending} loadingLabel="Guardando…">
            Guardar categoría
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
