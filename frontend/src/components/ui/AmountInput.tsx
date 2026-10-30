import { useId, useState } from 'react'
import { formatMontoEditable, parseMontoInput } from '../../lib/money'

export function AmountInput({
  label = 'Monto',
  value,
  onChange,
  error,
  help,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  error?: string
  help?: string
}) {
  const id = useId()
  const [display, setDisplay] = useState(() => formatMontoEditable(value))
  const [focused, setFocused] = useState(false)
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-etiqueta">
        {label}
      </label>
      <div
        className={`flex min-h-20 items-baseline gap-1 rounded-control border bg-papel-2 p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${error ? 'border-peligro' : 'border-borde'}`}
      >
        <span aria-hidden="true" className="text-titulo font-casual text-tinta-2">
          $
        </span>
        {/* Texto + inputMode: el input numérico acepta "e" y no deja mostrar miles en vivo (D-10) */}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="0"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="w-full min-w-0 bg-transparent text-monto font-casual text-tinta outline-none placeholder:text-tinta-2"
          value={focused ? display : formatMontoEditable(value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            setDisplay(formatMontoEditable(value))
          }}
          onChange={(e) => {
            const input = e.target
            const next = parseMontoInput(input.value)
            setDisplay(next.display)
            onChange(next.value)
            // El display cambia de largo al agrupar miles; el caret vuelve al final
            requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length))
          }}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-etiqueta font-normal text-peligro">
          {error}
        </p>
      )}
      {!error && help && (
        <p id={`${id}-help`} className="mt-1 text-etiqueta font-normal text-tinta-2">
          {help}
        </p>
      )}
    </div>
  )
}
