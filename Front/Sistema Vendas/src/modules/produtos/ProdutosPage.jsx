import { useState } from 'react'
import { Button, Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import ProdutoFormModal from './ProdutoFormModal'
import SaldoEstoque from './components/SaldoEstoque/SaldoEstoque'
import { situacaoEstoque } from './situacaoEstoque'
import { useCarregar } from '../../hooks/useCarregar'
import { useNotificacao } from '../../hooks/useNotificacao'
import { useAuth } from '../../hooks/useAuth'
import {
  atualizarProduto,
  criarProduto,
  excluirProduto,
  listarProdutos,
} from '../../services/produtosService'
import { formatarMoeda, normalizarBusca } from '../../utils/formatters'

const FILTROS = {
  todos: () => true,
  estoque: (p) => p.controlaEstoque,
  encomenda: (p) => !p.controlaEstoque,
  alerta: (p) => ['zerado', 'baixo', 'sem-registro'].includes(situacaoEstoque(p)),
}

// SPV-64 — tela principal dos produtos (lista, busca, cadastro, edição e exclusão)
export default function ProdutosPage() {
  const notificar = useNotificacao()
  const { usuario } = useAuth()
  const { dados: produtos, carregando, erro, recarregar } = useCarregar(listarProdutos, [])

  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [formulario, setFormulario] = useState(null) // { produto } (produto null = novo)
  const [excluindo, setExcluindo] = useState(null)

  const termo = normalizarBusca(busca)
  const lista = produtos ?? []
  const visiveis = lista.filter(
    (p) =>
      FILTROS[tipo](p) &&
      (!termo ||
        normalizarBusca(p.nome).includes(termo) ||
        normalizarBusca(p.descricao).includes(termo)),
  )
  const emAlerta = lista.filter(FILTROS.alerta).length

  const salvar = async (valores) => {
    const editado = formulario.produto
    valores = { ...valores, idUsuario: usuario.id }
    if (editado) {
      await atualizarProduto(editado, valores)
      notificar(`Produto ${valores.nome.trim()} atualizado.`)
    } else {
      await criarProduto(valores)
      notificar(`Produto ${valores.nome.trim()} cadastrado.`)
    }
    setFormulario(null)
    await recarregar(true)
  }

  return (
    <>
      <PageHeader
        titulo="Produtos"
        subtitulo="Produtos de pronta entrega (com estoque) e sob encomenda"
      >
        <Button onClick={() => setFormulario({ produto: null })}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Novo produto
        </Button>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      <div className="spv-card">
        <div className="spv-card-body border-bottom">
          <div className="row g-2">
            <div className="col-md-8">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search" aria-hidden="true"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por nome ou descrição"
                  aria-label="Buscar produtos"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-md-4">
              <Form.Select
                aria-label="Tipo de produto"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="todos">Todos os produtos</option>
                <option value="estoque">Com controle de estoque</option>
                <option value="encomenda">Sob encomenda (sem estoque)</option>
                <option value="alerta">Estoque em alerta ({emAlerta})</option>
              </Form.Select>
            </div>
          </div>
        </div>

        {carregando ? (
          <Carregando texto="Carregando produtos..." />
        ) : visiveis.length === 0 ? (
          <EstadoVazio icone="bi-box-seam" titulo="Nenhum produto encontrado.">
            {lista.length === 0
              ? 'Cadastre o primeiro produto no botão "Novo produto".'
              : 'Ajuste a busca ou o filtro.'}
          </EstadoVazio>
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="d-none d-md-table-cell">Tipo</th>
                  <th className="text-end">Valor</th>
                  <th>Estoque</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="fw-semibold">{p.nome}</div>
                      {p.descricao && (
                        <div
                          className="small text-secondary text-truncate"
                          style={{ maxWidth: 320 }}
                        >
                          {p.descricao}
                        </div>
                      )}
                    </td>
                    <td className="d-none d-md-table-cell">
                      {p.controlaEstoque ? (
                        <span className="badge rounded-pill text-bg-light border">
                          <i className="bi bi-box-seam me-1" aria-hidden="true"></i>
                          Pronta entrega
                        </span>
                      ) : (
                        <span className="badge rounded-pill text-bg-light border">
                          <i className="bi bi-scissors me-1" aria-hidden="true"></i>
                          Sob encomenda
                        </span>
                      )}
                    </td>
                    <td className="text-end fw-semibold text-nowrap">{formatarMoeda(p.valor)}</td>
                    <td>
                      <SaldoEstoque produto={p} />
                    </td>
                    <td className="text-end text-nowrap">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-1"
                        onClick={() => setFormulario({ produto: p })}
                      >
                        <i className="bi bi-pencil" aria-hidden="true"></i>
                        <span className="d-none d-lg-inline ms-1">Editar</span>
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => setExcluindo(p)}>
                        <i className="bi bi-trash" aria-hidden="true"></i>
                        <span className="d-none d-lg-inline ms-1">Excluir</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {produtos && (
          <div className="px-3 py-2 small text-secondary border-top">
            {visiveis.length} de {lista.length} produto(s)
          </div>
        )}
      </div>

      {formulario && (
        <ProdutoFormModal
          key={formulario.produto?.id ?? 'novo'}
          produto={formulario.produto}
          produtosExistentes={lista}
          aoSalvar={salvar}
          aoFechar={() => setFormulario(null)}
        />
      )}

      <ConfirmModal
        aberto={Boolean(excluindo)}
        titulo="Excluir produto"
        textoConfirmar="Excluir"
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={async () => {
          await excluirProduto(excluindo.id)
          notificar(`Produto ${excluindo.nome} excluído.`)
          await recarregar(true)
        }}
      >
        <p className="mb-0">
          Excluir <strong>{excluindo?.nome}</strong>
          {excluindo?.estoque && ` e o estoque dele (${excluindo.estoque.atual} un.)`}? Essa ação
          não pode ser desfeita. Produtos que já estão em pedidos não podem ser excluídos.
        </p>
      </ConfirmModal>
    </>
  )
}
