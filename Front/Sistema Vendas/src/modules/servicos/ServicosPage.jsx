import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function ServicosPage() {
  return (
    <>
      <PageHeader titulo="Serviços" subtitulo="Cadastro de serviços oferecidos" />
      <EmConstrucao requisitos={['REQ006']} fase={2} />
    </>
  )
}
