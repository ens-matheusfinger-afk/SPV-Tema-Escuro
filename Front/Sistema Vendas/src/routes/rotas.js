import { TELAS } from '../utils/constants'

import DashboardPage from '../modules/dashboard/DashboardPage'
import PedidoNovoPage from '../modules/pedidos/PedidoNovoPage'
import PedidosPendentesPage from '../modules/pedidos/PedidosPendentesPage'
import PedidosListaPage from '../modules/pedidos/PedidosListaPage'
import RetiradaPage from '../modules/retirada/RetiradaPage'
import ProducaoPage from '../modules/producao/ProducaoPage'
import ConferenciaPage from '../modules/conferencia/ConferenciaPage'
import ClientesPage from '../modules/clientes/ClientesPage'
import ProdutosPage from '../modules/produtos/ProdutosPage'
import ServicosPage from '../modules/servicos/ServicosPage'
import UsuariosPage from '../modules/usuarios/UsuariosPage'
import EstoquePage from '../modules/estoque/EstoquePage'
import CaixaPage from '../modules/financeiro/CaixaPage'
import FinanceiroPage from '../modules/financeiro/FinanceiroPage'
import ContasPagarPage from '../modules/financeiro/ContasPagarPage'
import ContasReceberPage from '../modules/financeiro/ContasReceberPage'
import PendenciasPage from '../modules/financeiro/PendenciasPage'
import FluxoCaixaPage from '../modules/financeiro/FluxoCaixaPage'
import PedidoDetalhePage from '../modules/pedidos/PedidoDetalhePage'
import PedidosPorClientePage from '../modules/pedidos/PedidosPorClientePage'
import PedidosEntregasPage from '../modules/pedidos/PedidosEntregasPage'
import MeuUsuarioPage from '../modules/conta/MeuUsuarioPage'
import LogsPage from '../modules/logs/LogsPage'

/*
 * Fonte única de rotas + menu.
 * Para criar uma tela nova: crie o componente em modules/ e adicione um item aqui.
 * O menu lateral e as rotas são gerados a partir desta lista, já filtrando por permissão.
 *
 * Campos: label, icone (Bootstrap Icons), path, tela (permissão), componente
 * ativoEm (opcional): outras URLs em que o item fica destacado no menu
 * Grupos têm "itens" em vez de path.
 */
export const MENU = [
  {
    label: 'Dashboard',
    icone: 'bi-bar-chart-line',
    path: '/dashboard',
    tela: TELAS.DASHBOARD,
    componente: DashboardPage,
  },
  {
    label: 'Pedidos',
    icone: 'bi-receipt',
    itens: [
      {
        label: 'Novo pedido',
        icone: 'bi-plus-circle',
        path: '/pedidos/novo',
        tela: TELAS.PEDIDOS,
        componente: PedidoNovoPage,
      },
      {
        label: 'Pendentes',
        icone: 'bi-hourglass-split',
        path: '/pedidos/pendentes',
        tela: TELAS.PEDIDOS,
        componente: PedidosPendentesPage,
      },
      {
        label: 'Próximas entregas',
        icone: 'bi-calendar-week',
        path: '/pedidos/entregas',
        tela: TELAS.PEDIDOS,
        componente: PedidosEntregasPage,
      },
      {
        label: 'Todos os pedidos',
        icone: 'bi-list-ul',
        path: '/pedidos',
        tela: TELAS.PEDIDOS,
        componente: PedidosListaPage,
        ativoEm: /^\/pedidos\/\d+$/,
      },
      {
        label: 'Por cliente',
        icone: 'bi-person-lines-fill',
        path: '/pedidos/cliente',
        tela: TELAS.PEDIDOS,
        componente: PedidosPorClientePage,
      },
      {
        label: 'Aguardando cliente',
        icone: 'bi-bag-check',
        path: '/retirada',
        tela: TELAS.RETIRADA,
        componente: RetiradaPage,
      },
    ],
  },
  {
    label: 'Produção',
    icone: 'bi-gear-wide-connected',
    path: '/producao',
    tela: TELAS.PRODUCAO,
    componente: ProducaoPage,
  },
  {
    label: 'Conferência',
    icone: 'bi-clipboard-check',
    path: '/conferencia',
    tela: TELAS.CONFERENCIA,
    componente: ConferenciaPage,
  },
  {
    label: 'Cadastros',
    icone: 'bi-folder2-open',
    itens: [
      {
        label: 'Clientes',
        icone: 'bi-person-vcard',
        path: '/clientes',
        tela: TELAS.CLIENTES,
        componente: ClientesPage,
      },
      {
        label: 'Produtos',
        icone: 'bi-tag',
        path: '/produtos',
        tela: TELAS.PRODUTOS,
        componente: ProdutosPage,
      },
      {
        label: 'Serviços',
        icone: 'bi-tools',
        path: '/servicos',
        tela: TELAS.SERVICOS,
        componente: ServicosPage,
      },
      {
        label: 'Usuários',
        icone: 'bi-people',
        path: '/usuarios',
        tela: TELAS.USUARIOS,
        componente: UsuariosPage,
      },
      {
        // SPV-111 / REQ028: quem administra os usuários também consulta os logs
        label: 'Logs do sistema',
        icone: 'bi-journal-text',
        path: '/logs',
        tela: TELAS.USUARIOS,
        componente: LogsPage,
      },
    ],
  },
  {
    label: 'Estoque',
    icone: 'bi-box-seam',
    path: '/estoque',
    tela: TELAS.ESTOQUE,
    componente: EstoquePage,
  },
  {
    label: 'Financeiro',
    icone: 'bi-cash-coin',
    itens: [
      {
        // SPV-82: aparece para quem tem qualquer uma das telas do financeiro
        label: 'Visão geral',
        icone: 'bi-speedometer2',
        path: '/financeiro',
        tela: [TELAS.CONTAS_PAGAR, TELAS.CONTAS_RECEBER, TELAS.CAIXA],
        componente: FinanceiroPage,
      },
      {
        label: 'Fechamento de caixa',
        icone: 'bi-safe',
        path: '/financeiro/caixa',
        tela: TELAS.CAIXA,
        componente: CaixaPage,
      },
      {
        // SPV-81: relatório de fluxo de caixa (o que entrou e saiu no período)
        label: 'Fluxo de caixa',
        icone: 'bi-graph-up',
        path: '/financeiro/fluxo-caixa',
        tela: TELAS.CAIXA,
        componente: FluxoCaixaPage,
      },
      {
        label: 'Contas a pagar',
        icone: 'bi-arrow-up-circle',
        path: '/financeiro/contas-pagar',
        tela: TELAS.CONTAS_PAGAR,
        componente: ContasPagarPage,
      },
      {
        label: 'Contas a receber',
        icone: 'bi-arrow-down-circle',
        path: '/financeiro/contas-receber',
        tela: TELAS.CONTAS_RECEBER,
        componente: ContasReceberPage,
      },
      {
        label: 'Pendências por cliente',
        icone: 'bi-exclamation-diamond',
        path: '/financeiro/pendencias',
        tela: TELAS.PENDENCIAS,
        componente: PendenciasPage,
      },
    ],
  },
]

// Rotas que existem mas não aparecem no menu lateral.
// tela: null = liberada para qualquer usuário logado.
const ROTAS_FORA_DO_MENU = [
  {
    label: 'Detalhe do pedido',
    grupo: 'Pedidos',
    path: '/pedidos/:id',
    tela: TELAS.PEDIDOS,
    componente: PedidoDetalhePage,
  },
  { label: 'Meu usuário', path: '/meu-usuario', tela: null, componente: MeuUsuarioPage },
]

// Lista "achatada" (sem grupos) para montar as rotas e o breadcrumb
export const ROTAS = [
  ...MENU.flatMap((item) =>
    item.itens ? item.itens.map((sub) => ({ ...sub, grupo: item.label })) : [item],
  ),
  ...ROTAS_FORA_DO_MENU,
]
