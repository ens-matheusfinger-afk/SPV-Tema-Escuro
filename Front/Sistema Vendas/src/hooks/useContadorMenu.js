import { useEffect, useState } from 'react'

/*
 * Número de aviso ao lado de um item do menu lateral (estoque mínimo, contas vencendo...).
 * Atualiza ao trocar de tela (atualizarEm = pathname). Sem permissão (ativo = false), não busca.
 * Se a busca falhar, simplesmente não mostra o número (o menu não pode quebrar por isso).
 */
export function useContadorMenu(ativo, atualizarEm, contar) {
  const [quantidade, setQuantidade] = useState(0)

  useEffect(() => {
    if (!ativo) return undefined
    let vivo = true
    contar()
      .then((n) => vivo && setQuantidade(n))
      .catch(() => vivo && setQuantidade(0))
    return () => {
      vivo = false
    }
  }, [ativo, atualizarEm, contar])

  return ativo ? quantidade : 0
}
