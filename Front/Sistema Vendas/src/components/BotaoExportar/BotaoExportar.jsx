import { useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useNotificacao } from '../../hooks/useNotificacao'
import { mensagemDeErro } from '../../services/api'

/*
 * Botão "Exportar Excel" padrão do sistema (SPV-102/103/104/105).
 * aoExportar: função assíncrona que gera o arquivo. quantidade: quantas linhas vão sair
 * (0 desabilita o botão e mostra a dica de que não há o que exportar).
 */
export default function BotaoExportar({ aoExportar, quantidade, rotulo = 'Exportar Excel', size }) {
  const notificar = useNotificacao()
  const [gerando, setGerando] = useState(false)
  const vazio = quantidade === 0

  const exportar = async () => {
    setGerando(true)
    try {
      await aoExportar()
      notificar(`Planilha gerada${quantidade ? ` com ${quantidade} linha(s)` : ''}.`)
    } catch (e) {
      notificar(`Não foi possível gerar a planilha: ${mensagemDeErro(e)}`, 'danger')
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button
      variant="light"
      className="border"
      size={size}
      disabled={gerando || vazio}
      title={vazio ? 'Nada para exportar com esse filtro' : 'Baixar como planilha do Excel (.xlsx)'}
      onClick={exportar}
    >
      {gerando ? (
        <Spinner size="sm" />
      ) : (
        <>
          <i className="bi bi-file-earmark-excel text-success me-1" aria-hidden="true"></i>
          {rotulo}
        </>
      )}
    </Button>
  )
}
