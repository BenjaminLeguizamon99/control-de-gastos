import { useEffect, useId, useRef, type ReactNode } from 'react'

// <dialog> + showModal(): focus trap, Esc, inert de fondo y vuelta del foco nativos
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const tituloId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      onClose={onClose}
      // Sin padding en el dialog: el clic solo cae en él cuando es sobre el backdrop (A2)
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none border-0 border-t border-linea bg-papel p-0 text-tinta shadow-hoja rounded-t-hoja backdrop:bg-velo sm:m-auto sm:max-w-120 sm:rounded-hoja"
    >
      <div className="overflow-y-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={tituloId} className="text-titulo font-casual">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-2 text-cuerpo text-tinta-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
