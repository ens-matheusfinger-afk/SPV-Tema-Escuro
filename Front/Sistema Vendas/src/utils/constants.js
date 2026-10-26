// Constantes compartilhadas por todo o front.
// Se mudar algo aqui, avise quem cuida do Back: estes valores precisam bater com o banco.

/*
 * TELAS — chaves de permissão.
 * O banco controla acesso por usuário e por tela (tabela "usuarioTela": tela + podeAcessar).
 * Cada rota do front tem uma destas chaves; o Back deve gravar exatamente estas strings
 * na coluna "tela".
 */
export const TELAS = {
  DASHBOARD: 'dashboard',
  PEDIDOS: 'pedidos',
  PRODUCAO: 'producao',
  CONFERENCIA: 'conferencia',
  RETIRADA: 'retirada',
  USUARIOS: 'usuarios',
  CLIENTES: 'clientes',
  PRODUTOS: 'produtos',
  SERVICOS: 'servicos',
  ESTOQUE: 'estoque',
  CAIXA: 'caixa',
  CONTAS_PAGAR: 'contas-pagar',
  CONTAS_RECEBER: 'contas-receber',
  PENDENCIAS: 'pendencias',
}

const TODAS_AS_TELAS = Object.values(TELAS)

// Nome amigável de cada tela, agrupado como no menu (usado na tela de permissões)
export const GRUPOS_DE_TELAS = [
  { grupo: 'Gestão', telas: [[TELAS.DASHBOARD, 'Dashboard (indicadores)']] },
  {
    grupo: 'Pedidos',
    telas: [
      [TELAS.PEDIDOS, 'Pedidos (novo, pendentes e consulta)'],
      [TELAS.RETIRADA, 'Aguardando cliente (retirada)'],
    ],
  },
  {
    grupo: 'Produção e qualidade',
    telas: [
      [TELAS.PRODUCAO, 'Produção'],
      [TELAS.CONFERENCIA, 'Conferência'],
    ],
  },
  {
    grupo: 'Cadastros',
    telas: [
      [TELAS.CLIENTES, 'Clientes'],
      [TELAS.PRODUTOS, 'Produtos'],
      [TELAS.SERVICOS, 'Serviços'],
      [TELAS.ESTOQUE, 'Estoque'],
      [TELAS.USUARIOS, 'Usuários e permissões'],
    ],
  },
  {
    grupo: 'Financeiro',
    telas: [
      [TELAS.CAIXA, 'Fechamento de caixa'],
      [TELAS.CONTAS_PAGAR, 'Contas a pagar'],
      [TELAS.CONTAS_RECEBER, 'Contas a receber'],
      [TELAS.PENDENCIAS, 'Pendências por cliente'],
    ],
  },
]

/*
 * PERFIS — modelos prontos de permissão (Documento de Visão, Tabela 2).
 * Servem para preencher as telas de um usuário novo de uma vez; o que vale no fim
 * é a lista de telas gravada para cada usuário.
 */
export const PERFIS = {
  ADMIN: {
    nome: 'Administrador',
    telas: TODAS_AS_TELAS,
  },
  ATENDENTE: {
    nome: 'Atendente / Vendedor',
    telas: [TELAS.PEDIDOS, TELAS.RETIRADA, TELAS.CLIENTES, TELAS.ESTOQUE],
  },
  OPERADOR: {
    nome: 'Operador de Produção',
    telas: [TELAS.PRODUCAO],
  },
  CONFERENTE: {
    nome: 'Conferente / Qualidade',
    telas: [TELAS.CONFERENCIA],
  },
  FINANCEIRO: {
    nome: 'Gestor Financeiro',
    telas: [TELAS.CAIXA, TELAS.CONTAS_PAGAR, TELAS.CONTAS_RECEBER, TELAS.PENDENCIAS],
  },
  GERENTE: {
    nome: 'Gerente / Diretor',
    telas: [TELAS.DASHBOARD],
  },
}

/*
 * STATUS_PEDIDO — mesmos números do Back (pedidosModels.js / tabelaPedidos.sql),
 * seguindo a máquina de estados "Venda até a entrega".
 * "cor" = cor do Bootstrap usada no selo (badge) do status.
 */
export const STATUS_PEDIDO = {
  1: { nome: 'Cadastrado', cor: 'secondary', icone: 'bi-pencil-square' },
  2: { nome: 'Em produção', cor: 'primary', icone: 'bi-gear-wide-connected' },
  3: { nome: 'Aguardando conferência', cor: 'warning', icone: 'bi-clipboard-check' },
  4: { nome: 'Aguardando cliente', cor: 'info', icone: 'bi-bag-check' },
  5: { nome: 'Finalizado', cor: 'success', icone: 'bi-check-circle' },
  6: { nome: 'Cancelado', cor: 'danger', icone: 'bi-x-circle' },
}

// Pedidos ainda em andamento (REQ009 — pendentes)
export const STATUS_ABERTOS = [1, 2, 3, 4]

// Status em que os itens e os dados do pedido ainda podem ser alterados
export const STATUS_EDITAVEL = 1

/*
 * Próximos passos permitidos a partir de cada status (REQ005 / REQ011 / REQ020).
 * O cancelamento fica separado porque sempre pede confirmação (REQ038).
 */
export const ACOES_STATUS = {
  1: [{ para: 2, rotulo: 'Iniciar produção', icone: 'bi-play-circle', variante: 'primary' }],
  2: [{ para: 3, rotulo: 'Enviar para conferência', icone: 'bi-send', variante: 'primary' }],
  3: [
    { para: 4, rotulo: 'Aprovar conferência', icone: 'bi-check2-circle', variante: 'primary' },
    {
      para: 2,
      rotulo: 'Devolver para produção',
      icone: 'bi-arrow-counterclockwise',
      variante: 'outline-secondary',
    },
  ],
  4: [
    {
      para: 5,
      rotulo: 'Registrar entrega e finalizar',
      icone: 'bi-check-circle',
      variante: 'success',
    },
  ],
  5: [],
  6: [],
}

// REQ030 — encerra a sessão depois deste tempo sem interação
export const MINUTOS_INATIVIDADE = 15

// Regra mínima para senhas novas
export const TAMANHO_MINIMO_SENHA = 6

// SPV-107 — limites contra erro de digitação (Poka-Yoke)
export const QUANTIDADE_MAXIMA_ITEM = 9999
export const DIAS_MAXIMOS_ENTREGA = 365
