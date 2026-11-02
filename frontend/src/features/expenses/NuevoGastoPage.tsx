import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ApiError, api } from '../../api/client'
import type { ExpenseApi, ExpenseCreate, LastPaymentMethod } from '../../api/types'
import { AmountInput } from '../../components/ui/AmountInput'
import { Button } from '../../components/ui/Button'
import { CategoryGrid } from '../../components/ui/CategoryGrid'
import { Monto } from '../../components/ui/Monto'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { CATEGORIA_FALTA } from '../../lib/categorias'
import { ayer, hoyART } from '../../lib/fecha'
import { MONTO_DECIMALES, MONTO_VACIO, aCentavos } from '../../lib/money'
import { NETWORK_ERROR } from '../auth/authErrors'
import { CategoriaSheet } from '../categories/CategoriaSheet'
import { useCategorias } from '../categories/useCategorias'

type Medio = ExpenseCreate['payment_method']

// Espacio de ancho cero: permite cortar después de la barra en pantallas angostas
const MEDIOS = [
  { value: 'debit', label: `Débito/${String.fromCharCode(0x200b)}Transferencia` },
  { value: 'cash', label: 'Efectivo' },
]

const FRASES = [
  'Tu billetera llora un poquito.',
  'Queda en la libreta.',
  'Uno menos para acordarte.',
  'La plata se fue, el registro queda.',
  'Listo, ¿cargamos otro?',
]

const CATEGORIA_NO_EXISTE = 'Esa categoría ya no existe. Elegí otra.'
const FECHA_FALTA = 'Elegí una fecha.'
const GUARDAR_RED = 'No pudimos guardar el gasto. Revisá tu conexión y volvé a tocar "Guardar gasto".'
const GUARDAR_CONFLICTO =
  'Este gasto ya se había guardado con los datos anteriores. Si volvés a tocar "Guardar gasto", se guarda como un gasto aparte.'

const inputBase =
  'w-full min-h-12 rounded-control border border-borde bg-papel-2 px-4 text-cuerpo text-tinta placeholder:text-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento'
const linkClass =
  'inline-flex min-h-11 items-center py-2 text-etiqueta font-normal text-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento'
const pressed = 'border-2 border-tinta!'

interface Toast {
  monto: string
  emoji: string
  nombre: string
  frase: string
}

export function NuevoGastoPage() {
  const queryClient = useQueryClient()
  const categorias = useCategorias()
  const ultimoMedio = useQuery({
    queryKey: ['last-payment-method'],
    queryFn: () => api<LastPaymentMethod>('/expenses/last-payment-method'),
  })

  const [monto, setMonto] = useState('')
  const [montoKey, setMontoKey] = useState(0)
  const [categoria, setCategoria] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [medioElegido, setMedio] = useState<Medio | null>(null)
  const [fecha, setFecha] = useState(hoyART)
  const [errores, setErrores] = useState<{ monto?: string; categoria?: string; fecha?: string }>({})
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [sheetAbierto, setSheetAbierto] = useState(false)
  const [sheetKey, setSheetKey] = useState(0)

  // Mismo UUID en los reintentos: el POST es idempotente y no duplica (GAS-09)
  const draftId = useRef(crypto.randomUUID())
  const fraseIdx = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const formRef = useRef<HTMLFormElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const fechaRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  // D-19: lo que eligió el usuario manda; si no, el último medio del servidor (crédito cae en débito, D-20)
  const medio: Medio = medioElegido ?? (ultimoMedio.data?.payment_method === 'cash' ? 'cash' : 'debit')
  const hoy = hoyART()
  const ayerISO = ayer(hoy)

  const mutation = useMutation({
    mutationFn: (body: ExpenseCreate) => api<ExpenseApi>('/expenses', { method: 'POST', body }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const nuevos: typeof errores = {}
    if (monto === '' || aCentavos(monto) <= 0n) nuevos.monto = MONTO_VACIO
    else if ((monto.split('.')[1] ?? '').length > 2) nuevos.monto = MONTO_DECIMALES
    if (!categoria) nuevos.categoria = CATEGORIA_FALTA
    if (!fecha) nuevos.fecha = FECHA_FALTA
    setErrores(nuevos)

    // Los controles ya están en el DOM: se enfoca el primero inválido en el orden del formulario
    if (nuevos.monto) return formRef.current?.querySelector<HTMLInputElement>('input[inputmode="decimal"]')?.focus()
    if (nuevos.categoria) return gridRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus()
    if (nuevos.fecha) return fechaRef.current?.focus()

    const cat = categorias.data?.find((c) => c.id === categoria)
    if (!cat) return
    const guardado = monto
    setErrorGuardar(null)
    mutation.mutate(
      {
        id: draftId.current,
        amount_cents: Number(aCentavos(monto)),
        category_id: cat.id,
        description: descripcion.trim() || null,
        payment_method: medio,
        date: fecha,
      },
      {
        onSuccess: () => {
          const frase = FRASES[fraseIdx.current % FRASES.length]
          fraseIdx.current++
          setToast({ monto: guardado, emoji: cat.emoji, nombre: cat.nombre, frase })
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setToast(null), 3000)
          queryClient.setQueryData<LastPaymentMethod>(['last-payment-method'], { payment_method: medio })
          // D-18: medio y fecha se conservan
          setMonto('')
          setCategoria(null)
          setDescripcion('')
          setErrores({})
          draftId.current = crypto.randomUUID()
          setMontoKey((k) => k + 1)
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 404) {
            setErrores((x) => ({ ...x, categoria: CATEGORIA_NO_EXISTE }))
            setCategoria(null)
            queryClient.invalidateQueries({ queryKey: ['categories'] })
          } else if (err instanceof ApiError && err.status === 409) {
            // El primer intento llegó al servidor y después se editó el form: el borrador nuevo necesita otro id
            draftId.current = crypto.randomUUID()
            setErrorGuardar(GUARDAR_CONFLICTO)
          } else {
            setErrorGuardar(GUARDAR_RED)
          }
        },
      },
    )
  }

  function elegirFecha(f: string) {
    setFecha(f)
    setErrores((x) => ({ ...x, fecha: undefined }))
  }

  return (
    <main className="mx-auto max-w-120 px-4 pb-8 sm:px-6">
      <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-4 top-[calc(0.5rem+env(safe-area-inset-top))] mx-auto max-w-112">
        {toast && (
          <div className="rounded-control bg-tinta px-4 py-2 text-papel">
            <p className="font-semibold">
              Anotado: <Monto value={toast.monto} size="cuerpo" /> en {toast.emoji} {toast.nombre}
            </p>
            <p className="text-etiqueta font-normal">{toast.frase}</p>
          </div>
        )}
      </div>

      <Link to="/" className={linkClass}>
        Volver
      </Link>
      <h1 className="mb-6 text-titulo font-casual">Nuevo gasto</h1>

      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <AmountInput
          key={montoKey}
          autoFocus
          value={monto}
          onChange={(v) => {
            setMonto(v)
            setErrores((x) => ({ ...x, monto: undefined }))
          }}
          error={errores.monto}
        />

        <div ref={gridRef}>
          {categorias.data ? (
            <CategoryGrid
              categorias={categorias.data}
              value={categoria}
              onChange={(id) => {
                setCategoria(id)
                setErrores((x) => ({ ...x, categoria: undefined }))
              }}
              onNueva={() => {
                setSheetKey((k) => k + 1)
                setSheetAbierto(true)
              }}
            />
          ) : (
            <fieldset>
              <legend className="mb-2 text-etiqueta">Categoría</legend>
              {categorias.isError ? (
                <>
                  <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
                    {NETWORK_ERROR}
                  </p>
                  <Button variant="secundario" onClick={() => categorias.refetch()}>
                    Reintentar
                  </Button>
                </>
              ) : (
                <p className="text-etiqueta font-normal text-tinta-2">Cargando categorías…</p>
              )}
            </fieldset>
          )}
          {errores.categoria && (
            <p role="alert" className="mt-1 text-etiqueta font-normal text-peligro">
              {errores.categoria}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="descripcion" className="mb-2 block text-etiqueta">
            Descripción (opcional)
          </label>
          <input
            id="descripcion"
            type="text"
            maxLength={140}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="Ej.: almuerzo con el equipo"
            className={inputBase}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <SegmentedControl legend="Medio de pago" options={MEDIOS} value={medio} onChange={(v) => setMedio(v as Medio)} />

        <fieldset>
          <legend className="mb-2 text-etiqueta">Fecha</legend>
          <div className="flex gap-2">
            <Button
              variant="secundario"
              aria-pressed={fecha === hoy}
              className={fecha === hoy ? pressed : undefined}
              onClick={() => elegirFecha(hoy)}
            >
              Hoy
            </Button>
            <Button
              variant="secundario"
              aria-pressed={fecha === ayerISO}
              className={fecha === ayerISO ? pressed : undefined}
              onClick={() => elegirFecha(ayerISO)}
            >
              Ayer
            </Button>
            <input
              ref={fechaRef}
              type="date"
              aria-label="Otra fecha"
              aria-invalid={errores.fecha ? true : undefined}
              aria-describedby={errores.fecha ? 'fecha-error' : undefined}
              className={`${inputBase} min-w-0 flex-1 ${errores.fecha ? 'border-peligro!' : ''}`}
              value={fecha}
              onChange={(e) => elegirFecha(e.target.value)}
            />
          </div>
          {errores.fecha && (
            <p id="fecha-error" role="alert" className="mt-1 text-etiqueta font-normal text-peligro">
              {errores.fecha}
            </p>
          )}
        </fieldset>

        <div className="mt-2">
          {errorGuardar && (
            <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
              {errorGuardar}
            </p>
          )}
          <Button variant="primario" type="submit" fullWidth loading={mutation.isPending} loadingLabel="Guardando…">
            Guardar gasto
          </Button>
        </div>
      </form>

      {/* Fuera del form: su propio submit no debe disparar "Guardar gasto"; el resto del gasto no se toca (D-11) */}
      <CategoriaSheet
        key={sheetKey}
        open={sheetAbierto}
        onClose={() => setSheetAbierto(false)}
        categorias={categorias.data ?? []}
        editando={null}
        onGuardada={(c) => {
          setCategoria(c.id)
          setErrores((x) => ({ ...x, categoria: undefined }))
        }}
      />
    </main>
  )
}
