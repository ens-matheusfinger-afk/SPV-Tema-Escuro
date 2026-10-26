import { usuariosIniciais, usuarioTelaInicial } from './usuarios'

// Dados de exemplo do modo de teste. Os nomes dos campos são os mesmos do Back.
// Os valores decimais ficam como texto ("39.90") porque é assim que o Postgres devolve.

const dia = 24 * 60 * 60 * 1000

// Data só com dia (entrega prevista), no mesmo formato que o Back devolve
function diaRelativo(dias) {
  const d = new Date(Date.now() + dias * dia)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 3)).toISOString()
}

// "AAAA-MM-DD" daqui a N dias (contas a pagar/receber guardam só o dia)
function diaISO(dias) {
  const d = new Date(Date.now() + dias * dia)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function momentoRelativo(dias) {
  return new Date(Date.now() + dias * dia).toISOString()
}

export function criarDadosIniciais() {
  const clientes = [
    { id: 1, nome: 'Maria Silva', telefone: '41999990001', email: 'maria@email.com', status: true },
    {
      id: 2,
      nome: 'João Pereira',
      telefone: '41988880002',
      email: 'joao@email.com',
      status: true,
      fatorConfianca: 2,
      observacao: 'Atrasou o pagamento duas vezes. Só liberar o pedido com pagamento na retirada.',
    },
    {
      id: 3,
      nome: 'Escola Aprender Ltda',
      telefone: '4133330003',
      email: 'contato@aprender.com',
      status: true,
      fatorConfianca: 5,
      observacao: 'Pedidos grandes no início do semestre. Falar com a Sra. Rosa (secretaria).',
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
    anexosPedido: [],
    // SPV-84/97: caixa de ontem fechado; hoje com vendas no balcão e uma compra em dinheiro
    fechamentosCaixa: [
      {
        id: 1,
        data: diaISO(-1),
        saldoInicial: '0.00',
        entradasDinheiro: '150.00',
        entradasPix: '320.00',
        entradasCartao: '89.90',
        saidasDinheiro: '0.00',
        saidasOutras: '0.00',
        dinheiroEsperado: '150.00',
        dinheiroContado: '150.00',
        diferenca: '0.00',
        observacao: null,
        idUsuario: 1,
        fechadoEm: momentoRelativo(-0.6),
      },
    ],
    caixa: [
      ['entrada', 'dinheiro', '150.00', 'Venda no balcão: 5 canecas', -1, 2],
      ['entrada', 'pix', '320.00', 'Venda no balcão: uniformes', -1, 2],
      ['entrada', 'cartao', '89.90', 'Venda no balcão: kit presente', -1, 2],
      ['entrada', 'cartao', '45.00', 'Venda no balcão: 1 caneca personalizada', 0, 2],
      ['saida', 'dinheiro', '30.00', 'Compra de linha (armarinho)', 0, 1],
    ].map(([tipo, formaPagamento, valor, descricao, quando, idUsuario], i) => ({
      id: i + 1,
      // ontem às 15h / hoje um pouco antes de agora
      data:
        quando === 0
          ? new Date(Date.now() - (5 - i) * 60000).toISOString()
          : new Date(`${diaISO(-1)}T15:0${i}:00`).toISOString(),
      tipo,
      formaPagamento,
      valor,
      descricao,
      idPedido: null,
      idContaReceber: null,
      idContaPagar: null,
      idUsuario,
    })),
    // SPV-86: [descrição, categoria, fornecedor, valor, vence em X dias, pago há Y dias (null = em aberto), forma]
    contasPagar: [
      ['Aluguel do galpão', 'Aluguel', 'Imobiliária Centro', '1800.00', -2, null, null],
      ['Conta de energia', 'Energia e água', 'Copel', '412.35', 1, null, null],
      ['Malha PV 40 kg', 'Matéria-prima', 'Têxtil Paraná', '1290.00', 6, null, null],
      ['Internet fibra', 'Internet e telefone', 'NetSul', '129.90', 12, null, null],
      ['Linhas e aviamentos', 'Matéria-prima', 'Armarinho Central', '236.40', 20, null, null],
      ['Salário costureira', 'Salários', null, '2100.00', -5, 5, 'transferencia'],
      ['DAS Simples Nacional', 'Impostos', 'Receita Federal', '380.12', -10, 11, 'boleto'],
    ].map(([descricao, tipo, fornecedor, valor, vence, pago, forma], i) => ({
      id: i + 1,
      item: 1,
      tipo,
      descricao,
      fornecedor,
      valor,
      dataVencimento: diaISO(vence),
      dataCriacao: diaISO(Math.min(vence, 0) - 10),
      dataPagamento: pago === null ? null : diaISO(-pago),
      formaPagamento: forma,
    })),
    // SPV-85: contas avulsas e um sinal já recebido. As contas dos pedidos o mock cria sozinho
    // (igual à trigger trg_pedidos_conta_receber do banco).
    contasReceber: [
      {
        id: 1,
        idPedido: 1,
        idCliente: 3,
        descricao: 'Pedido nº 1',
        total: '1723.50',
        dataPrevisao: diaRelativo(2).slice(0, 10),
        dataRecebimento: diaISO(-6),
        formaPagamento: 'pix',
        dataCriacao: diaISO(-6),
      },
      {
        id: 2,
        idPedido: null,
        idCliente: 2,
        descricao: 'Ajuste de 8 calças (sem pedido)',
        total: '160.00',
        dataPrevisao: diaISO(-5),
        dataRecebimento: null,
        formaPagamento: null,
        dataCriacao: diaISO(-20),
      },
      {
        id: 3,
        idPedido: null,
        idCliente: 4,
        descricao: 'Arte para cartão de visita',
        total: '60.00',
        dataPrevisao: diaISO(9),
        dataRecebimento: null,
        formaPagamento: null,
        dataCriacao: diaISO(-1),
      },
    ],
    // o saldo inicial de cada produto entra como a primeira movimentação do histórico
    movimentacoesEstoque: estoque.map((e, i) => ({
      id: i + 1,
      idProduto: e.idProduto,
      tipo: 'entrada',
      quantidade: e.estoqueAtual,
      saldoAnterior: 0,
      saldoAtual: e.estoqueAtual,
      motivo: 'Saldo inicial',
      idPedido: null,
      idUsuario: 1,
      data: momentoRelativo(-10),
    })),
    conferencias: [],
    // SPV-93/94/95: um apontamento concluído e um em andamento do operador (id 3)
    apontamentos: [
      {
        id: 1,
        idPedido: 1,
        idUsuario: 3,
        inicio: momentoRelativo(-1.1),
        fim: momentoRelativo(-1),
        quantidadeProduzida: 20,
        observacao: 'Primeira leva das camisetas',
      },
      {
        id: 2,
        idPedido: 8,
        idUsuario: 3,
        inicio: momentoRelativo(-0.03),
        fim: null,
        quantidadeProduzida: null,
        observacao: null,
      },
    ],
  }
}
