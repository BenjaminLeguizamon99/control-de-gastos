import type { CSSProperties } from 'react'
import { aCentavos, deCentavos, estadoRestante, montoTexto, porcentajeUsado } from '../../lib/money'
import { Monto } from './Monto'

const COLOR = {
  normal: { monto: 'text-tinta', barra: 'bg-acento', texto: 'text-tinta-2' },
  cerca: { monto: 'text-alerta', barra: 'bg-alerta', texto: 'text-alerta' },
  pasado: { monto: 'text-peligro', barra: 'bg-peligro', texto: 'text-peligro' },
}

export function RestanteMes({ restante, presupuesto }: { restante: string; presupuesto: string }) {
  const estado = estadoRestante(restante, presupuesto)
  const porcentaje = porcentajeUsado(restante, presupuesto)
  const usado = deCentavos(aCentavos(presupuesto) - aCentavos(restante))
  const exceso = deCentavos(-aCentavos(restante))
  const usaste = `Usaste ${montoTexto(usado)} de ${montoTexto(presupuesto)}`
  // El estado siempre va con texto, nunca solo por color (D-09)
  const texto =
    estado === 'cerca'
      ? `! Te queda poco este mes. ${usaste}`
      : estado === 'pasado'
        ? `Te pasaste ${montoTexto(exceso)}. ${usaste}`
        : usaste

  return (
    <div>
      <p className="text-cuerpo text-tinta-2">{estado === 'pasado' ? 'Te pasaste' : 'Te quedan'}</p>
      <Monto value={estado === 'pasado' ? exceso : restante} size="monto" className={`mt-1 ${COLOR[estado].monto}`} />
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        aria-valuetext={texto}
        aria-label="Usado del presupuesto"
        className="mt-2 h-2 overflow-hidden rounded-full bg-papel-2"
      >
        {/* Única excepción al "sin style inline": el ancho es un dato de runtime */}
        <div className={`h-full w-(--usado) rounded-full ${COLOR[estado].barra}`} style={{ '--usado': `${porcentaje}%` } as CSSProperties} />
      </div>
      <p className={`mt-2 text-etiqueta ${COLOR[estado].texto}`}>{texto}</p>
    </div>
  )
}
