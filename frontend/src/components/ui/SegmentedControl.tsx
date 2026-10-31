import { useId } from 'react'

type Opcion = { value: string; label: string }

// Radios nativos: teclado (Tab + flechas) y lector de pantalla sin JS propio
export function SegmentedControl({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: Opcion[]
  value: string
  onChange: (value: string) => void
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 text-etiqueta">{legend}</legend>
      <div className="flex min-h-12 gap-1 rounded-control border border-borde bg-papel-2 p-1">
        {options.map((o) => (
          // relative: contiene el sr-only (absolute) y evita scroll horizontal
          <label
            key={o.value}
            className="relative flex flex-1 items-center justify-center rounded-segmento text-center border border-transparent text-cuerpo text-tinta-2 transition-colors duration-(--duracion-corta) ease-(--ease-salida) motion-reduce:transition-none has-[:checked]:border-borde has-[:checked]:bg-papel has-[:checked]:font-semibold has-[:checked]:text-tinta has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento"
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
