import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function ContasReceberPage() {
  return (
    <>
      <PageHeader titulo="Contas a receber" subtitulo="Recebimentos previstos e realizados" />
      <EmConstrucao requisitos={['REQ015']} fase={5} />
    </>
  )
}
