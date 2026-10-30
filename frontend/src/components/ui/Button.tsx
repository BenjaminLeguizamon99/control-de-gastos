import type { ComponentProps } from 'react'

const VARIANTE = {
  primario: 'bg-acento text-sobre-acento hover:bg-acento-fuerte active:bg-acento-fuerte',
  secundario: 'border border-borde text-tinta hover:bg-papel-2 active:bg-papel-2',
  peligro: 'border border-peligro text-peligro hover:bg-papel-2 active:bg-papel-2',
}

// hover: de Tailwind 4 ya va dentro de @media (hover: hover), así no queda pegado en el celular
const base =
  'inline-flex min-h-12 items-center justify-center px-6 rounded-control text-cuerpo font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:opacity-50 disabled:cursor-not-allowed'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primario' | 'secundario' | 'peligro'
  loading?: boolean
  loadingLabel?: string
  fullWidth?: boolean
}

export function Button({
  variant = 'primario',
  loading = false,
  loadingLabel,
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${VARIANTE[variant]}${fullWidth ? ' w-full' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
}
