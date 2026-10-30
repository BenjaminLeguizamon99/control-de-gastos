import { formatMonto } from '../../lib/money'

const TAMANO = {
  monto: { entero: 'text-monto font-casual', centavos: 'text-titulo font-casual' },
  cuerpo: { entero: 'text-cuerpo', centavos: 'text-cuerpo' },
}

export function Monto({
  value,
  size = 'cuerpo',
  className,
}: {
  value: string
  size?: 'monto' | 'cuerpo'
  className?: string
}) {
  const { entero, centavos } = formatMonto(value)
  return (
    <span className={`inline-flex items-baseline${className ? ` ${className}` : ''}`}>
      <span className={TAMANO[size].entero}>{entero}</span>
      {centavos && <span className={TAMANO[size].centavos}>{centavos}</span>}
    </span>
  )
}
