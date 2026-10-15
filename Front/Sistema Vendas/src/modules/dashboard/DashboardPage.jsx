import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        titulo="Dashboard"
        subtitulo="Indicadores gerenciais: faturamento, produtividade e volume de pedidos"
      />
      <EmConstrucao requisitos={['REQ018', 'REQ035', 'REQ019']} fase={6} />
    </>
  )
}
