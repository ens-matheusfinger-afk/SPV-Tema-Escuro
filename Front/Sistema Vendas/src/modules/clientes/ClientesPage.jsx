import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function ClientesPage() {
  return (
    <>
      <PageHeader
        titulo="Clientes"
        subtitulo="Cadastro de clientes pessoa física (CPF) e jurídica (CNPJ)"
      />
      <EmConstrucao requisitos={[]} fase={2} />
    </>
  )
}
