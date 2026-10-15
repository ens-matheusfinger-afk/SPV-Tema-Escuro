import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function PendenciasPage() {
  return (
    <>
      <PageHeader titulo="Pendências por cliente" subtitulo="Clientes com valores em aberto" />
      <EmConstrucao requisitos={['REQ016']} fase={5} />
    </>
  )
}
