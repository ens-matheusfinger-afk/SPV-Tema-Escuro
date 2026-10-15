import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function RetiradaPage() {
  return (
    <>
      <PageHeader
        titulo="Aguardando cliente"
        subtitulo="Pedidos conferidos e prontos para retirada"
      />
      <EmConstrucao requisitos={['REQ012']} fase={4} />
    </>
  )
}
