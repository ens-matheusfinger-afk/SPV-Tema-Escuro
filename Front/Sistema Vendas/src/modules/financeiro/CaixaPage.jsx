import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function CaixaPage() {
  return (
    <>
      <PageHeader
        titulo="Fechamento de caixa"
        subtitulo="Movimentações e fechamento do caixa diário"
      />
      <EmConstrucao requisitos={['REQ013']} fase={5} />
    </>
  )
}
