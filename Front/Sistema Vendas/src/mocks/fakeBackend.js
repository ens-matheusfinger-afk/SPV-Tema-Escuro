import { AxiosError } from 'axios'
import { obterBanco, persistir, proximoId } from './bancoMock'

/*
 * Back falso para o modo de teste.
 * Responde às MESMAS rotas e com o MESMO formato de JSON do Back real (Express + Sequelize),
 * então os services e as telas não sabem se estão falando com o mock ou com o servidor.
 *
 * Rotas que ainda NÃO existem no Back real e precisam ser criadas lá (marcadas com [FALTA NO BACK]):
 *   POST /login                       { login, senha } -> usuário com UsuarioTelas
 *   PUT  /usuarios/:id/senha          { senhaAtual, novaSenha }
 *   /usuario-tela/...                 já existe o arquivo de rotas, mas não está registrado no index.js
 */

const STATUS_CANCELADO = 6
const STATUS_FINALIZADO = 5
const ATRASO_MS = 150

class ErroHttp extends Error {
  constructor(status, corpo) {
    super(corpo.erro || 'Erro')
    this.status = status
    this.corpo = corpo
  }
}

const falhar = (status, erro, extra = {}) => {
  throw new ErroHttp(status, { erro, ...extra })
}

const copia = (obj) => JSON.parse(JSON.stringify(obj))
const semSenha = (usuario) => {
  const copiaUsuario = { ...usuario }
  delete copiaUsuario.senha
  return copiaUsuario
}

// ---------- helpers que imitam os "include" do Sequelize ----------

function usuarioComTelas(db, usuario) {
  return {
    ...semSenha(usuario),
    UsuarioTelas: db.usuarioTela.filter((t) => t.idUsuario === usuario.id),
  }
}

function clienteCompleto(db, cliente) {
  return {
    ...cliente,
    ClienteCPF: db.clientesCpf.find((c) => c.idCliente === cliente.id) ?? null,
    ClienteCNPJ: db.clientesCnpj.find((c) => c.idCliente === cliente.id) ?? null,
  }
}

function vendedorDe(db, pedido) {
  const u = db.usuarios.find((x) => x.id === pedido.idVendedor)
  return u ? { id: u.id, nome: u.nome } : null
}

function itemCompleto(db, item) {
  const produto = item.idProduto ? db.produtos.find((p) => p.id === item.idProduto) : null
  const servico = item.idServico ? db.servicos.find((s) => s.id === item.idServico) : null
  return {
    ...item,
    produto: produto ? { id: produto.id, nome: produto.nome } : null,
    servico: servico ? { id: servico.id, nome: servico.nome } : null,
  }
}

function recalcularTotal(db, idPedido) {
  const total = db.itensPedido
    .filter((i) => i.idPedido === idPedido)
    .reduce((soma, i) => soma + i.quantidade * Number(i.valorUnitario), 0)
  const pedido = db.pedidos.find((p) => p.id === idPedido)
  pedido.total = total.toFixed(2)
  return pedido
}

function pedidoOuFalha(db, id) {
  const pedido = db.pedidos.find((p) => p.id === Number(id))
  if (!pedido) falhar(404, 'Pedido não encontrado.')
  return pedido
}

// ---------- rotas ----------

const rotas = [
  // ===== autenticação [FALTA NO BACK] =====
  [
    'post',
    '/login',
    (db, _p, body) => {
      const usuario = db.usuarios.find(
        (u) =>
          u.login ===
          String(body.login || '')
            .trim()
            .toLowerCase(),
      )
      if (!usuario || usuario.senha !== body.senha) falhar(401, 'Usuário ou senha inválidos.')
      if (Number(usuario.status) !== 1) falhar(403, 'Usuário inativo. Fale com o administrador.')
      return usuarioComTelas(db, usuario)
    },
  ],

  // ===== usuários =====
  ['get', '/usuarios', (db) => db.usuarios.map((u) => usuarioComTelas(db, u))],
  [
    'get',
    '/usuarios/:id',
    (db, p) => {
      const u = db.usuarios.find((x) => x.id === Number(p.id))
      return u ? usuarioComTelas(db, u) : null
    },
  ],
  [
    'post',
    '/usuarios',
    (db, _p, body) => {
      if (db.usuarios.some((u) => u.login === body.login)) falhar(500, 'Validation error')
      const usuario = {
        id: proximoId('usuarios'),
        login: body.login,
        senha: body.senha,
        nome: body.nome,
        status: body.status ?? 1,
      }
      db.usuarios.push(usuario)
      return [201, semSenha(usuario)]
    },
  ],
  [
    'put',
    '/usuarios/:id',
    (db, p, body) => {
      const usuario = db.usuarios.find((x) => x.id === Number(p.id))
      if (!usuario) falhar(500, "Cannot read properties of null (reading 'update')")
      if (body.login && db.usuarios.some((u) => u.login === body.login && u.id !== usuario.id)) {
        falhar(500, 'Validation error')
      }
      for (const campo of ['login', 'nome', 'status']) {
        if (body[campo] !== undefined) usuario[campo] = body[campo]
      }
      if (body.senha) usuario.senha = body.senha
      return semSenha(usuario)
    },
  ],
  // [FALTA NO BACK]
  [
    'put',
    '/usuarios/:id/senha',
    (db, p, body) => {
      const usuario = db.usuarios.find((x) => x.id === Number(p.id))
      if (!usuario) falhar(404, 'Usuário não encontrado.')
      if (usuario.senha !== body.senhaAtual) falhar(400, 'A senha atual está incorreta.')
      usuario.senha = body.novaSenha
      return { mensagem: 'Senha alterada com sucesso.' }
    },
  ],

  // ===== permissões por tela (usuarioTela) [rota não registrada no index.js do Back] =====
  [
    'get',
    '/usuario-tela/usuario/:idUsuario',
    (db, p) => db.usuarioTela.filter((t) => t.idUsuario === Number(p.idUsuario)),
  ],
  [
    'post',
    '/usuario-tela',
    (db, _p, body) => {
      const registro = {
        id: proximoId('usuarioTela'),
        idUsuario: body.idUsuario,
        tela: body.tela,
        podeAcessar: Boolean(body.podeAcessar),
      }
      db.usuarioTela.push(registro)
      return [201, registro]
    },
  ],
  [
    'put',
    '/usuario-tela/:id',
    (db, p, body) => {
      const registro = db.usuarioTela.find((t) => t.id === Number(p.id))
      if (!registro) falhar(500, "Cannot read properties of null (reading 'update')")
      Object.assign(registro, {
        idUsuario: body.idUsuario,
        tela: body.tela,
        podeAcessar: Boolean(body.podeAcessar),
      })
      return registro
    },
  ],

  // ===== clientes / catálogo =====
  ['get', '/clientes', (db) => db.clientes.map((c) => clienteCompleto(db, c))],
  ['get', '/produtos', (db) => db.produtos],
  ['get', '/servicos', (db) => db.servicos],
  [
    'get',
    '/estoque',
    (db) =>
      db.estoque.map((e) => {
        const p = db.produtos.find((x) => x.id === e.idProduto)
        return { ...e, produto: p ? { id: p.id, nome: p.nome, valor: p.valor } : null }
      }),
  ],

  // ===== pedidos =====
  [
    'post',
    '/pedidos',
    (db, _p, body) => {
      if (!body.idCliente || !body.idVendedor)
        falhar(400, 'idCliente e idVendedor são obrigatórios.')
      if (!db.usuarios.some((u) => u.id === Number(body.idVendedor))) {
        falhar(404, 'Vendedor (usuário) não encontrado.')
      }
      const pedido = {
        dataCriacao: new Date().toISOString(),
        id: proximoId('pedidos'),
        descricao: body.descricao ?? null,
        idCliente: Number(body.idCliente),
        idVendedor: Number(body.idVendedor),
        dataEntregaPrevista: body.dataEntregaPrevista
          ? new Date(`${body.dataEntregaPrevista}T03:00:00.000Z`).toISOString()
          : null,
        anexo: body.anexo ?? null,
        status: 1,
        total: '0.00',
        dataEntregaRealizada: null,
      }
      db.pedidos.push(pedido)
      return [201, pedido]
    },
  ],
  [
    'get',
    '/pedidos',
    (db, _p, _b, query) =>
      db.pedidos
        .filter((p) => !query.status || p.status === Number(query.status))
        .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
        .map((p) => ({ ...p, vendedor: vendedorDe(db, p) })),
  ],
  [
    'get',
    '/pedidos/:id',
    (db, p) => {
      const pedido = pedidoOuFalha(db, p.id)
      return {
        ...pedido,
        vendedor: vendedorDe(db, pedido),
        itens: db.itensPedido
          .filter((i) => i.idPedido === pedido.id)
          .map((i) => itemCompleto(db, i)),
      }
    },
  ],
  [
    'put',
    '/pedidos/:id',
    (db, p, body) => {
      if (!body || Object.keys(body).length === 0)
        falhar(400, 'Envie ao menos um campo para atualizar.')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO)
        falhar(400, 'Não é possível editar um pedido cancelado.')
      // status e total têm rotas/cálculo próprios, igual ao Back
      const campos = { ...body }
      delete campos.status
      delete campos.total
      if (campos.dataEntregaPrevista) {
        campos.dataEntregaPrevista = new Date(
          `${campos.dataEntregaPrevista.slice(0, 10)}T03:00:00.000Z`,
        ).toISOString()
      }
      Object.assign(pedido, campos)
      return pedido
    },
  ],
  [
    'put',
    '/pedidos/:id/status',
    (db, p, body) => {
      if (![1, 2, 3, 4, 5, 6].includes(body.status))
        falhar(400, 'Status inválido. Use um valor de 1 a 6.')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO) {
        falhar(400, 'Não é possível alterar o status de um pedido cancelado.')
      }
      pedido.status = body.status
      if (body.status === STATUS_FINALIZADO) pedido.dataEntregaRealizada = new Date().toISOString()
      return pedido
    },
  ],
  [
    'delete',
    '/pedidos/:id',
    (db, p) => {
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO) falhar(400, 'Este pedido já está cancelado.')
      for (const item of db.itensPedido.filter(
        (i) => i.idPedido === pedido.id && i.tipoItem === 'produto',
      )) {
        const estoque = db.estoque.find((e) => e.idProduto === item.idProduto)
        if (estoque) estoque.estoqueAtual += item.quantidade
      }
      pedido.status = STATUS_CANCELADO
      return { mensagem: 'Pedido cancelado com sucesso.', pedido }
    },
  ],

  // ===== itens do pedido =====
  [
    'post',
    '/pedidos/:id/itens',
    (db, p, body) => {
      const { tipoItem, idProduto, idServico, quantidade } = body
      if (!['produto', 'servico'].includes(tipoItem))
        falhar(400, "tipoItem deve ser 'produto' ou 'servico'.")
      if (!quantidade || quantidade <= 0) falhar(400, 'Informe uma quantidade maior que zero.')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO) {
        falhar(400, 'Não é possível adicionar itens a um pedido cancelado.')
      }

      let valorUnitario
      if (tipoItem === 'produto') {
        if (!idProduto) falhar(400, 'idProduto é obrigatório para tipoItem "produto".')
        const produto = db.produtos.find((x) => x.id === Number(idProduto))
        if (!produto) falhar(404, 'Produto não encontrado.')
        valorUnitario = produto.valor
        if (produto.controlaEstoque) {
          const estoque = db.estoque.find((e) => e.idProduto === produto.id)
          if (!estoque) {
            falhar(
              400,
              'Este produto controla estoque, mas não tem registro de estoque cadastrado.',
            )
          }
          if (estoque.estoqueAtual < quantidade) {
            falhar(400, 'Saldo insuficiente em estoque.', { estoqueAtual: estoque.estoqueAtual })
          }
          estoque.estoqueAtual -= quantidade
        }
      } else {
        if (!idServico) falhar(400, 'idServico é obrigatório para tipoItem "servico".')
        const servico = db.servicos.find((x) => x.id === Number(idServico))
        if (!servico) falhar(404, 'Serviço não encontrado.')
        valorUnitario = servico.valor
      }

      const item = {
        id: proximoId('itensPedido'),
        idPedido: pedido.id,
        tipoItem,
        idProduto: tipoItem === 'produto' ? Number(idProduto) : null,
        idServico: tipoItem === 'servico' ? Number(idServico) : null,
        quantidade,
        valorUnitario,
      }
      db.itensPedido.push(item)
      return [201, { item, pedido: recalcularTotal(db, pedido.id) }]
    },
  ],
  [
    'put',
    '/pedidos/:id/itens/:itemId',
    (db, p, body) => {
      const { quantidade } = body
      if (!quantidade || quantidade <= 0) falhar(400, 'Informe uma quantidade maior que zero.')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO)
        falhar(400, 'Não é possível editar itens de um pedido cancelado.')
      const item = db.itensPedido.find((i) => i.id === Number(p.itemId) && i.idPedido === pedido.id)
      if (!item) falhar(404, 'Item não encontrado neste pedido.')

      const diferenca = quantidade - item.quantidade
      if (item.tipoItem === 'produto' && diferenca !== 0) {
        const produto = db.produtos.find((x) => x.id === item.idProduto)
        if (produto?.controlaEstoque) {
          const estoque = db.estoque.find((e) => e.idProduto === item.idProduto)
          if (!estoque) falhar(400, 'Registro de estoque não encontrado para este produto.')
          if (diferenca > 0 && estoque.estoqueAtual < diferenca) {
            falhar(400, 'Saldo insuficiente em estoque.', { estoqueAtual: estoque.estoqueAtual })
          }
          estoque.estoqueAtual -= diferenca
        }
      }
      item.quantidade = quantidade
      return { item, pedido: recalcularTotal(db, pedido.id) }
    },
  ],
  [
    'delete',
    '/pedidos/:id/itens/:itemId',
    (db, p) => {
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO)
        falhar(400, 'Não é possível remover itens de um pedido cancelado.')
      const indice = db.itensPedido.findIndex(
        (i) => i.id === Number(p.itemId) && i.idPedido === pedido.id,
      )
      if (indice < 0) falhar(404, 'Item não encontrado neste pedido.')
      const [item] = db.itensPedido.splice(indice, 1)
      if (item.tipoItem === 'produto') {
        const produto = db.produtos.find((x) => x.id === item.idProduto)
        const estoque = db.estoque.find((e) => e.idProduto === item.idProduto)
        if (produto?.controlaEstoque && estoque) estoque.estoqueAtual += item.quantidade
      }
      return { mensagem: 'Item removido com sucesso.', pedido: recalcularTotal(db, pedido.id) }
    },
  ],
]

// Transforma "/pedidos/:id/itens" em uma expressão regular com grupos nomeados
const compiladas = rotas.map(([metodo, caminho, acao]) => ({
  metodo,
  regex: new RegExp(`^${caminho.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
  acao,
}))

// Adapter do axios: em vez de fazer HTTP, resolve a requisição aqui mesmo
export async function fakeBackend(config) {
  await new Promise((r) => setTimeout(r, ATRASO_MS))

  const metodo = (config.method || 'get').toLowerCase()
  const [caminho, queryString] = (config.url || '').split('?')
  const query = {
    ...Object.fromEntries(new URLSearchParams(queryString || '')),
    ...(config.params || {}),
  }
  Object.keys(query).forEach((k) => query[k] === undefined && delete query[k])
  const corpo =
    typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}

  const resposta = (status, data) => ({
    data: copia(data),
    status,
    statusText: String(status),
    headers: { 'content-type': 'application/json' },
    config,
    request: {},
  })

  const rota = compiladas.find((r) => r.metodo === metodo && r.regex.test(caminho))
  if (!rota) {
    const res = resposta(404, {
      erro: `Rota ${metodo.toUpperCase()} ${caminho} não existe no mock.`,
    })
    throw new AxiosError(`Request failed with status code 404`, 'ERR_BAD_REQUEST', config, {}, res)
  }

  try {
    const db = obterBanco()
    const params = caminho.match(rota.regex).groups || {}
    const resultado = rota.acao(db, params, corpo, query)
    if (metodo !== 'get') persistir()
    const [status, data] =
      Array.isArray(resultado) && typeof resultado[0] === 'number' ? resultado : [200, resultado]
    return resposta(status, data)
  } catch (erro) {
    if (!(erro instanceof ErroHttp)) throw erro
    const res = resposta(erro.status, erro.corpo)
    const codigo = erro.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST'
    throw new AxiosError(`Request failed with status code ${erro.status}`, codigo, config, {}, res)
  }
}
