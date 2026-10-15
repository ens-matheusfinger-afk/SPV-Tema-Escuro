import { usuariosIniciais, usuarioTelaInicial } from './usuarios'

// Dados de exemplo do modo de teste. Os nomes dos campos são os mesmos do Back.
// Os valores decimais ficam como texto ("39.90") porque é assim que o Postgres devolve.

const dia = 24 * 60 * 60 * 1000

// Data só com dia (entrega prevista), no mesmo formato que o Back devolve
function diaRelativo(dias) {
  const d = new Date(Date.now() + dias * dia)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 3)).toISOString()
}

function momentoRelativo(dias) {
  return new Date(Date.now() + dias * dia).toISOString()
}

export function criarDadosIniciais() {
  const clientes = [
    { id: 1, nome: 'Maria Silva', telefone: '41999990001', email: 'maria@email.com', status: true },
    { id: 2, nome: 'João Pereira', telefone: '41988880002', email: 'joao@email.com', status: true },
    {
      id: 3,
      nome: 'Escola Aprender Ltda',
      telefone: '4133330003',
      email: 'contato@aprender.com',
      status: true,
    },
    {
      id: 4,
      nome: 'Fernanda Costa',
      telefone: '41977770004',
      email: 'fernanda@email.com',
      status: true,
    },
    {
      id: 5,
      nome: 'Academia Força Total ME',
      telefone: '4132220005',
      email: 'adm@forcatotal.com',
      status: true,
    },
    {
      id: 6,
      nome: 'Roberto Lima',
      telefone: '41966660006',
      email: 'roberto@email.com',
      status: false,
    },
  ]
  const clientesCpf = [
    { id: 1, idCliente: 1, cpf: '52998224725' },
    { id: 2, idCliente: 2, cpf: '11144477735' },
    { id: 3, idCliente: 4, cpf: '39053344705' },
    { id: 4, idCliente: 6, cpf: '86288366757' },
  ]
  const clientesCnpj = [
    { id: 1, idCliente: 3, cnpj: '11222333000181', nomeFantasia: 'Colégio Aprender' },
    { id: 2, idCliente: 5, cnpj: '45723174000110', nomeFantasia: 'Força Total' },
  ]

  const produtos = [
    {
      id: 1,
      nome: 'Camiseta básica',
      descricao: 'Algodão, várias cores',
      valor: '39.90',
      controlaEstoque: true,
    },
    {
      id: 2,
      nome: 'Caneca personalizada',
      descricao: 'Cerâmica 325 ml',
      valor: '29.90',
      controlaEstoque: true,
    },
    {
      id: 3,
      nome: 'Uniforme sob medida',
      descricao: 'Confecção sob encomenda',
      valor: '89.90',
      controlaEstoque: false,
    },
    {
      id: 4,
      nome: 'Boné',
      descricao: 'Aba curva, regulável',
      valor: '34.90',
      controlaEstoque: true,
    },
    {
      id: 5,
      nome: 'Banner em lona',
      descricao: '1 x 0,8 m',
      valor: '120.00',
      controlaEstoque: false,
    },
  ]
  const estoque = [
    { id: 1, idProduto: 1, estoqueAtual: 46, estoqueMinimo: 10, estoqueMaximo: 200 },
    { id: 2, idProduto: 2, estoqueAtual: 3, estoqueMinimo: 5, estoqueMaximo: 60 },
    { id: 3, idProduto: 4, estoqueAtual: 12, estoqueMinimo: 4, estoqueMaximo: 50 },
  ]
  const servicos = [
    { id: 1, nome: 'Estampa silk', descricao: 'Até 2 cores', valor: '15.00', duracaoEstimada: 30 },
    { id: 2, nome: 'Bordado', descricao: 'Logo até 8 cm', valor: '25.00', duracaoEstimada: 45 },
    { id: 3, nome: 'Ajuste de costura', descricao: null, valor: '20.00', duracaoEstimada: 20 },
    {
      id: 4,
      nome: 'Arte digital',
      descricao: 'Criação de arte',
      valor: '60.00',
      duracaoEstimada: 90,
    },
  ]

  // [id, cliente, vendedor, status, criado há X dias, entrega em Y dias, descrição, itens]
  const base = [
    [
      1,
      3,
      2,
      2,
      -6,
      2,
      'Uniformes do 3º ano',
      [
        ['produto', 3, 30, '89.90'],
        ['servico', 2, 30, '25.00'],
      ],
    ],
    [
      2,
      1,
      2,
      1,
      -1,
      5,
      'Camisetas para aniversário',
      [
        ['produto', 1, 4, '39.90'],
        ['servico', 1, 4, '15.00'],
      ],
    ],
    [
      3,
      5,
      2,
      3,
      -4,
      1,
      'Bonés da equipe',
      [
        ['produto', 4, 6, '34.90'],
        ['servico', 2, 6, '25.00'],
      ],
    ],
    [
      4,
      2,
      1,
      4,
      -8,
      -1,
      'Caneca de presente',
      [
        ['produto', 2, 2, '29.90'],
        ['servico', 4, 1, '60.00'],
      ],
    ],
    [5, 4, 2, 5, -15, -10, 'Ajuste de vestido', [['servico', 3, 1, '20.00']]],
    [
      6,
      3,
      1,
      1,
      0,
      10,
      'Banner da feira de ciências',
      [
        ['produto', 5, 2, '120.00'],
        ['servico', 4, 1, '60.00'],
      ],
    ],
    [7, 1, 2, 6, -12, -5, 'Pedido duplicado', [['produto', 1, 1, '39.90']]],
    [
      8,
      5,
      1,
      2,
      -3,
      -1,
      'Camisetas para corrida',
      [
        ['produto', 1, 20, '39.90'],
        ['servico', 1, 20, '15.00'],
      ],
    ],
  ]

  let idItem = 1
  const itensPedido = []
  const pedidos = base.map(
    ([id, idCliente, idVendedor, status, criado, entrega, descricao, itens]) => {
      let total = 0
      for (const [tipoItem, idRef, quantidade, valorUnitario] of itens) {
        itensPedido.push({
          id: idItem++,
          idPedido: id,
          tipoItem,
          idProduto: tipoItem === 'produto' ? idRef : null,
          idServico: tipoItem === 'servico' ? idRef : null,
          quantidade,
          valorUnitario,
        })
        total += quantidade * Number(valorUnitario)
      }
      return {
        id,
        descricao,
        idCliente,
        idVendedor,
        dataCriacao: momentoRelativo(criado),
        dataEntregaPrevista: diaRelativo(entrega),
        dataEntregaRealizada: status === 5 ? momentoRelativo(entrega) : null,
        status,
        total: total.toFixed(2),
        anexo: null,
      }
    },
  )

  return {
    usuarios: usuariosIniciais(),
    usuarioTela: usuarioTelaInicial(),
    clientes,
    clientesCpf,
    clientesCnpj,
    produtos,
    estoque,
    servicos,
    pedidos,
    itensPedido,
  }
}
