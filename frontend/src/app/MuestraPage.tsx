import { Button } from '../components/ui/Button'
import { Monto } from '../components/ui/Monto'
import { RestanteMes } from '../components/ui/RestanteMes'

// Solo datos fijos: es pública y no puede tocar la API ni la sesión (T-02-04)
export function MuestraPage() {
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
    </main>
  )
}
