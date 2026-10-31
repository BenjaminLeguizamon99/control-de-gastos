import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { CategoryApi } from '../../api/types'
import { aCategoria, ordenar } from '../../lib/categorias'

export function useCategorias() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => ordenar((await api<CategoryApi[]>('/categories')).map(aCategoria)),
  })
}
