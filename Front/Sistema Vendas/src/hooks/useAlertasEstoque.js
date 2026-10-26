import { contarAlertasEstoque } from '../services/estoqueService'
import { useContadorMenu } from './useContadorMenu'

// SPV-108 — quantos produtos estão no estoque mínimo ou abaixo (aviso no menu lateral)
export function useAlertasEstoque(ativo, atualizarEm) {
  return useContadorMenu(ativo, atualizarEm, contarAlertasEstoque)
}
