import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function EstoquePage() {
  return (
    <>
      <PageHeader titulo="Estoque" subtitulo="Entradas, saídas e saldo dos produtos para venda" />
      <EmConstrucao requisitos={['REQ017']} fase={6} />
    </>
  )
}
