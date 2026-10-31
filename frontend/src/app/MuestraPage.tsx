import { useState } from 'react'
import { AmountInput } from '../components/ui/AmountInput'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Button } from '../components/ui/Button'
import { CategoryGrid, NOMBRES_COLOR, SOLIDO, type Categoria } from '../components/ui/CategoryGrid'
import { Monto } from '../components/ui/Monto'
import { RestanteMes } from '../components/ui/RestanteMes'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { MONTO_VACIO } from '../lib/money'

const CATEGORIAS: Categoria[] = [
  { id: 'comida', emoji: '🍔', nombre: 'Comida', color: 1 },
  { id: 'transporte', emoji: '🚌', nombre: 'Transporte', color: 6 },
  { id: 'super', emoji: '🛒', nombre: 'Súper', color: 4 },
  { id: 'casa', emoji: '🏠', nombre: 'Casa', color: 10 },
  { id: 'servicios', emoji: '💡', nombre: 'Servicios', color: 3 },
  { id: 'salud', emoji: '💊', nombre: 'Salud', color: 5 },
  { id: 'salidas', emoji: '🎉', nombre: 'Salidas', color: 9 },
  { id: 'regalos', emoji: '🎁', nombre: 'Regalos', color: 7 },
  { id: 'otros', emoji: '📦', nombre: 'Otros', color: 2 },
]

const MEDIOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
]

// Solo datos fijos: es pública y no puede tocar la API ni la sesión (T-02-04)
export function MuestraPage() {
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState('debito')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [hoja, setHoja] = useState<'categoria' | 'borrar' | null>(null)
  const cerrar = () => setHoja(null)

  return (
    <main className="mx-auto min-h-dvh max-w-120 px-4 pb-16 sm:px-6">
      <h1 className="pt-8 text-titulo font-casual">Sistema de diseño</h1>
      <p className="text-cuerpo text-tinta-2">Así se ven los componentes de Control de Gastos.</p>

      <section className="mt-8">
        <h2 className="mb-4 text-titulo font-casual">Cuánto te queda</h2>
        <RestanteMes restante="80000" presupuesto="200000" />
        <div className="mt-8">
          <RestanteMes restante="25000.50" presupuesto="200000" />
        </div>
        <div className="mt-8">
          <RestanteMes restante="-15000" presupuesto="200000" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-titulo font-casual">Montos</h2>
        <div className="flex flex-col gap-4">
          <Monto value="125430" size="monto" />
          <Monto value="125430.50" size="monto" />
          <Monto value="0" size="monto" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-titulo font-casual">Botones</h2>
        <div className="flex flex-col gap-4">
          <Button variant="primario">Guardar gasto</Button>
          <Button variant="secundario">Elegir categoría</Button>
          <Button variant="peligro">Borrar gasto</Button>
          <Button variant="primario" loading loadingLabel="Guardando…">
            Guardar gasto
          </Button>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-titulo font-casual">Monto</h2>
        <AmountInput value={monto} onChange={setMonto} help="Usá coma para los centavos." />
        <div className="mt-8">
          <AmountInput label="Monto" value="" onChange={() => {}} error={MONTO_VACIO} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-titulo font-casual">Medio de pago</h2>
        <SegmentedControl legend="Medio de pago" options={MEDIOS} value={medio} onChange={setMedio} />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-titulo font-casual">Categorías</h2>
        <CategoryGrid categorias={CATEGORIAS} value={categoria} onChange={setCategoria} />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-titulo font-casual">Hoja inferior</h2>
        <div className="flex flex-col gap-4">
          <Button variant="secundario" onClick={() => setHoja('categoria')}>
            Elegir categoría
          </Button>
          <Button variant="peligro" onClick={() => setHoja('borrar')}>
            Borrar gasto
          </Button>
        </div>
        <BottomSheet open={hoja === 'categoria'} onClose={cerrar} title="Elegí una categoría">
          <CategoryGrid categorias={CATEGORIAS} value={categoria} onChange={setCategoria} />
        </BottomSheet>
        {/* Sin datos: los dos botones solo cierran la hoja (T-02-10) */}
        <BottomSheet open={hoja === 'borrar'} onClose={cerrar} title="¿Borrar este gasto?">
          <p className="text-cuerpo text-tinta-2">Se borra para siempre. No se puede deshacer.</p>
          <div className="mt-6 flex flex-col gap-4">
            <Button variant="peligro" fullWidth onClick={cerrar}>
              Borrar gasto
            </Button>
            <Button variant="secundario" fullWidth onClick={cerrar}>
              Cancelar
            </Button>
          </div>
        </BottomSheet>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-titulo font-casual">Voz</h2>
        <h3 className="text-titulo font-casual">Todavía no anotaste nada este mes</h3>
        <p className="mt-2 text-cuerpo text-tinta-2">
          Cuando cargues tu primer gasto lo vas a ver acá. Por ahora, tu billetera respira tranquila.
        </p>
        <Button variant="primario" className="mt-4">
          Cargar gasto
        </Button>
        <p className="mt-8 text-cuerpo">Anotado. Tu billetera llora un poquito.</p>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-titulo font-casual">Colores de categoría</h2>
        <ul className="grid grid-cols-2 gap-4 rounded-tile bg-papel-2 p-4">
          {NOMBRES_COLOR.map(([color, nombre]) => (
            <li key={color} className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-8 rounded-control ${SOLIDO[color]}`} />
              <span className="text-etiqueta">{nombre}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
