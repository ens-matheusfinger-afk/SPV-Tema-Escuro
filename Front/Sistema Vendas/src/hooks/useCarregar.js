import { useCallback, useEffect, useRef, useState } from 'react'
import { mensagemDeErro } from '../services/api'

/*
 * Carrega dados assíncronos com estados de carregando/erro.
 * Uso: const { dados, carregando, erro, recarregar } = useCarregar(() => listarPedidos(), [])
 * "recarregar(true)" atualiza sem mostrar o carregando de novo (útil depois de salvar).
 */
export function useCarregar(funcao, dependencias) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: '' })
  const funcaoRef = useRef(funcao)
  const ultimaChamada = useRef(0)

  useEffect(() => {
    funcaoRef.current = funcao
  })

  const executar = useCallback(async (silencioso = false) => {
    const chamada = ++ultimaChamada.current
    if (!silencioso) setEstado((e) => ({ ...e, carregando: true, erro: '' }))
    try {
      const dados = await funcaoRef.current()
      if (chamada === ultimaChamada.current) setEstado({ dados, carregando: false, erro: '' })
    } catch (e) {
      if (chamada === ultimaChamada.current) {
        setEstado((atual) => ({ ...atual, carregando: false, erro: mensagemDeErro(e) }))
      }
    }
  }, [])

  useEffect(() => {
    executar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias)

  return { ...estado, recarregar: executar }
}
