import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function ProducaoPage() {
  return (
    <>
      <PageHeader
        titulo="Produção"
        subtitulo="Apontamento de tempo e quantidade produzida por operador"
      />
      <EmConstrucao requisitos={['REQ010']} fase={4} />
    </>
  )
}
