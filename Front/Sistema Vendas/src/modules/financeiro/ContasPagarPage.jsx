import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function ContasPagarPage() {
  return (
    <>
      <PageHeader titulo="Contas a pagar" subtitulo="Lançamentos, vencimentos e pagamentos" />
      <EmConstrucao requisitos={['REQ014']} fase={5} />
    </>
  )
}
