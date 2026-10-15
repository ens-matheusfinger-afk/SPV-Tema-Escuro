import PageHeader from '../../components/PageHeader/PageHeader'
import EmConstrucao from '../../components/EmConstrucao/EmConstrucao'

export default function ProdutosPage() {
  return (
    <>
      <PageHeader
        titulo="Produtos"
        subtitulo="Cadastro de produtos de venda, confecção e estoque"
      />
      <EmConstrucao requisitos={['REQ007']} fase={2} />
    </>
  )
}
