import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function ConferenciaPage() {
  return (
    <>
      <PageHeader
        titulo="Conferência"
        subtitulo="Aprovação do pedido ou devolução para a produção"
      />
      <EmConstrucao requisitos={['REQ011']} fase={4} />
    </>
  )
}
