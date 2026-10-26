import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Dropdown, Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import SaldoEstoque from '../produtos/components/SaldoEstoque/SaldoEstoque'
import { situacaoEstoque } from '../produtos/situacaoEstoque'
import MovimentarEstoqueModal from './MovimentarEstoqueModal'
import HistoricoEstoqueModal from './HistoricoEstoqueModal'
import { useCarregar } from '../../hooks/useCarregar'
import { useAuth } from '../../hooks/useAuth'
import { useNotificacao } from '../../hooks/useNotificacao'
import { listarProdutos } from '../../services/produtosService'
import { ajustarSaldo, registrarEntrada, registrarSaida } from '../../services/estoqueService'
import { TELAS } from '../../utils/constants'
import { formatarMoeda, normalizarBusca } from '../../utils/formatters'
import './EstoquePage.css'

const EM_ALERTA = ['zerado', 'baixo']

const FILTROS = {
  todos: () => true,
  alerta: (p) => EM_ALERTA.includes(situacaoEstoque(p)),
  zerado: (p) => situacaoEstoque(p) === 'zerado',
  ok: (p) => situacaoEstoque(p) === 'ok',
}

/*
 * SPV-65 — tela de estoque (produtos de pronta entrega).
 * SPV-108 — alerta de estoque mínimo (aviso no topo, contador e filtro).
 * SPV-109 — ajuste manual pelo inventário, com motivo e histórico.
 */
export default function EstoquePage() {
  const { usuario, podeAcessar } = useAuth()
  const notificar = useNotificacao()
  const { dados, carregando, erro, recarregar } = useCarregar(listarProdutos, [])

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [movimento, setMovimento] = useState(null) // { produto, tipo }
  const [historico, setHistorico] = useState(null)

  // só produtos que controlam estoque e já têm o registro de estoque
  const produtos = (dados ?? []).filter((p) => p.controlaEstoque && p.estoque)
  const semRegistro = (dados ?? []).filter((p) => p.controlaEstoque && !p.estoque)
  const termo = normalizarBusca(busca)
  const visiveis = produtos.filter(
    (p) => FILTROS[filtro](p) && (!termo || normalizarBusca(p.nome).includes(termo)),
  )

  const emAlerta = produtos.filter(FILTROS.alerta)
  const zerados = produtos.filter(FILTROS.zerado).length
  const unidades = produtos.reduce((s, p) => s + p.estoque.atual, 0)
  const valorTotal = produtos.reduce((s, p) => s + p.estoque.atual * p.valor, 0)

  const confirmarMovimento = async ({ quantidade, motivo }) => {
    const { produto, tipo } = movimento
    const dadosMov = { motivo, idUsuario: usuario.id }
    if (tipo === 'entrada') {
      await registrarEntrada(produto.estoque.id, { ...dadosMov, quantidade })
      notificar(`Entrada de ${quantidade} un. de ${produto.nome} registrada.`)
    } else if (tipo === 'saida') {
      await registrarSaida(produto.estoque.id, { ...dadosMov, quantidade })
      notificar(`Saída de ${quantidade} un. de ${produto.nome} registrada.`)
    } else {
      await ajustarSaldo(produto.estoque.id, { ...dadosMov, novoSaldo: quantidade })
      notificar(`Saldo de ${produto.nome} ajustado para ${quantidade} un.`)
    }
    setMovimento(null)
    await recarregar(true)
  }

  return (
    <>
      <PageHeader
        titulo="Estoque"
        subtitulo="Saldo dos produtos de pronta entrega, entradas e ajustes"
      >
        {podeAcessar(TELAS.PRODUTOS) && (
          <Link to="/produtos" className="btn btn-light border">
            <i className="bi bi-tag me-1" aria-hidden="true"></i>
            Cadastro de produtos
          </Link>
        )}
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      {carregando ? (
        <Carregando texto="Carregando estoque..." />
      ) : (
        dados && (
          <>
            {/* SPV-108: aviso de estoque mínimo */}
            {emAlerta.length > 0 && (
              <Alert variant="warning" className="d-flex flex-wrap align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                <span>
                  <strong>{emAlerta.length} produto(s)</strong> no estoque mínimo ou abaixo:{' '}
                  {emAlerta.map((p) => `${p.nome} (${p.estoque.atual} un.)`).join(', ')}.
                </span>
                {filtro !== 'alerta' && (
                  <Button
                    size="sm"
                    variant="outline-dark"
                    className="ms-auto"
                    onClick={() => setFiltro('alerta')}
                  >
                    Ver só esses
                  </Button>
                )}
              </Alert>
            )}

            <div className="row g-2 g-md-3 mb-3">
              {[
                {
                  rotulo: 'Produtos controlados',
                  valor: produtos.length,
                  icone: 'bi-box-seam',
                  cor: 'var(--spv-sky)',
                },
                {
                  rotulo: 'Em alerta (mínimo)',
                  valor: emAlerta.length,
                  icone: 'bi-exclamation-triangle',
                  cor: '#f5b400',
                  destaque: emAlerta.length > 0,
                },
                {
                  rotulo: 'Sem estoque',
                  valor: zerados,
                  icone: 'bi-x-octagon',
                  cor: 'var(--bs-danger)',
                },
                {
                  rotulo: 'Valor em estoque',
                  valor: formatarMoeda(valorTotal),
                  detalhe: `${unidades} un. no total`,
                  icone: 'bi-cash-stack',
                  cor: 'var(--spv-emerald)',
                },
              ].map((c) => (
                <div className="col-6 col-lg-3" key={c.rotulo}>
                  <div className="spv-estoque-resumo" style={{ '--cor': c.cor }}>
                    <div className="spv-estoque-resumo-rotulo">
                      <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
                      {c.rotulo}
                    </div>
                    <div
                      className="spv-estoque-resumo-valor"
                      style={c.destaque ? { color: '#8a6100' } : undefined}
                    >
                      {c.valor}
                    </div>
                    {c.detalhe && <div className="spv-estoque-resumo-detalhe">{c.detalhe}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="spv-card">
              <div className="spv-card-body border-bottom">
                <div className="row g-2">
                  <div className="col-md-8">
                    <InputGroup>
                      <InputGroup.Text>
                        <i className="bi bi-search" aria-hidden="true"></i>
                      </InputGroup.Text>
                      <Form.Control
                        placeholder="Buscar produto"
                        aria-label="Buscar produto no estoque"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                      />
                    </InputGroup>
                  </div>
                  <div className="col-md-4">
                    <Form.Select
                      aria-label="Situação do estoque"
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    >
                      <option value="todos">Todas as situações</option>
                      <option value="alerta">No mínimo ou abaixo ({emAlerta.length})</option>
                      <option value="zerado">Sem estoque ({zerados})</option>
                      <option value="ok">Acima do mínimo</option>
                    </Form.Select>
                  </div>
                </div>
              </div>

              {visiveis.length === 0 ? (
                <EstadoVazio icone="bi-box-seam" titulo="Nenhum produto encontrado.">
                  {produtos.length === 0
                    ? 'Marque "Controlar estoque" no cadastro do produto para ele aparecer aqui.'
                    : 'Ajuste a busca ou o filtro.'}
                </EstadoVazio>
              ) : (
                <div className="table-responsive">
                  <table className="table spv-tabela">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Saldo</th>
                        <th className="d-none d-md-table-cell">Ocupação</th>
                        <th className="d-none d-lg-table-cell text-end">Valor em estoque</th>
                        <th className="text-end">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiveis.map((p) => {
                        const { atual, minimo, maximo } = p.estoque
                        const ocupacao = maximo
                          ? Math.min(100, Math.round((atual / maximo) * 100))
                          : null
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="fw-semibold">{p.nome}</div>
                              <div className="small text-secondary">
                                {formatarMoeda(p.valor)} / un.
                              </div>
                            </td>
                            <td>
                              <SaldoEstoque produto={p} />
                            </td>
                            <td className="d-none d-md-table-cell" style={{ minWidth: 150 }}>
                              {ocupacao === null ? (
                                <span className="small text-secondary">sem máximo definido</span>
                              ) : (
                                <>
                                  <div
                                    className={`spv-ocupacao spv-ocupacao-${situacaoEstoque(p)}`}
                                    role="progressbar"
                                    aria-label="Ocupação do estoque"
                                    aria-valuenow={ocupacao}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  >
                                    <span style={{ width: `${ocupacao}%` }}></span>
                                    <i
                                      style={{ left: `${Math.min(100, (minimo / maximo) * 100)}%` }}
                                      title={`Mínimo: ${minimo}`}
                                    ></i>
                                  </div>
                                  <div className="small text-secondary">
                                    {atual} de {maximo} un. ({ocupacao}%)
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="d-none d-lg-table-cell text-end text-nowrap">
                              {formatarMoeda(atual * p.valor)}
                            </td>
                            <td className="text-end text-nowrap">
                              <Button
                                size="sm"
                                variant="success"
                                className="me-1"
                                onClick={() => setMovimento({ produto: p, tipo: 'entrada' })}
                              >
                                <i className="bi bi-plus-lg" aria-hidden="true"></i>
                                <span className="d-none d-lg-inline ms-1">Entrada</span>
                              </Button>
                              <Dropdown className="d-inline-block" align="end">
                                <Dropdown.Toggle size="sm" variant="light" className="border">
                                  Mais
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  <Dropdown.Item
                                    disabled={atual === 0}
                                    onClick={() => setMovimento({ produto: p, tipo: 'saida' })}
                                  >
                                    <i className="bi bi-box-arrow-up me-2" aria-hidden="true"></i>
                                    Saída manual
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    onClick={() => setMovimento({ produto: p, tipo: 'ajuste' })}
                                  >
                                    <i className="bi bi-sliders me-2" aria-hidden="true"></i>
                                    Ajustar pelo inventário
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item onClick={() => setHistorico(p)}>
                                    <i className="bi bi-clock-history me-2" aria-hidden="true"></i>
                                    Histórico
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-3 py-2 small text-secondary border-top">
                {visiveis.length} de {produtos.length} produto(s) com estoque controlado
                {semRegistro.length > 0 &&
                  ` · ${semRegistro.length} marcado(s) para controlar estoque sem saldo configurado (edite no cadastro de produtos)`}
              </div>
            </div>
          </>
        )
      )}

      {movimento && (
        <MovimentarEstoqueModal
          key={`${movimento.tipo}-${movimento.produto.id}`}
          produto={movimento.produto}
          tipo={movimento.tipo}
          aoConfirmar={confirmarMovimento}
          aoFechar={() => setMovimento(null)}
        />
      )}
      {historico && (
        <HistoricoEstoqueModal
          produto={historico}
          podeVerPedidos={podeAcessar(TELAS.PEDIDOS)}
          aoFechar={() => setHistorico(null)}
        />
      )}
    </>
  )
}
