// SPV-111 / REQ028 — registro de logs das operações relevantes.
//
// Como funciona:
//  - o Front manda o id de quem está logado no cabeçalho "X-Usuario-Id" (services/api.js);
//  - o middleware "auditoria" olha cada requisição que ALTERA algo (POST/PUT/DELETE) e, se deu
//    certo (status 2xx), grava uma linha na tabela logs com uma frase legível;
//  - o login (certo, errado, bloqueado) e a saída são gravados no authControllers.
// O log nunca derruba a operação: se der erro ao gravar, só aparece um aviso no terminal.
const Logs = require('../models/logsModels');
const Usuario = require('../models/usuariosModels');

const STATUS = {
  1: 'Cadastrado',
  2: 'Em produção',
  3: 'Aguardando conferência',
  4: 'Aguardando cliente',
  5: 'Finalizado (entregue)',
  6: 'Cancelado',
};
const FORMAS = { dinheiro: 'dinheiro', pix: 'PIX', cartao: 'cartão', boleto: 'boleto', transferencia: 'transferência' };

const moeda = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;
const dia = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const texto = (v, max = 80) => (v ? `"${String(v).trim().slice(0, max)}"` : '');

let avisouTabela = false;

const ipDe = (req) => (req.ip || req.socket?.remoteAddress || '').replace('::ffff:', '').slice(0, 64) || null;

function idDoUsuario(req) {
  const doCabecalho = Number(req.get?.('x-usuario-id'));
  if (Number.isInteger(doCabecalho) && doCabecalho > 0) return doCabecalho;
  const doCorpo = Number(req.body?.idUsuario ?? req.body?.idVendedor);
  return Number.isInteger(doCorpo) && doCorpo > 0 ? doCorpo : null;
}

// Grava uma linha de log. dados: { modulo, acao, descricao, entidade?, idEntidade?, detalhes?, idUsuario?, usuarioNome? }
async function registrarLog(req, dados) {
  try {
    const idUsuario = 'idUsuario' in dados ? dados.idUsuario : idDoUsuario(req);
    let usuarioNome = dados.usuarioNome ?? null;
    if (idUsuario && !usuarioNome) {
      const u = await Usuario.findByPk(idUsuario, { attributes: ['id', 'nome'] });
      usuarioNome = u?.nome ?? null;
    }
    await Logs.create({
      dataHora: new Date(),
      idUsuario: usuarioNome ? idUsuario : null, // id que não existe não vai para a FK
      usuarioNome,
      modulo: dados.modulo,
      acao: dados.acao,
      descricao: String(dados.descricao).slice(0, 500),
      entidade: dados.entidade ?? null,
      idEntidade: Number.isInteger(Number(dados.idEntidade)) ? Number(dados.idEntidade) : null,
      ip: dados.ip ?? ipDe(req),
      detalhes: dados.detalhes ?? null,
    });
  } catch (erro) {
    if (!avisouTabela) {
      avisouTabela = true;
      console.warn(`[logs] Não foi possível gravar o log (rode DATABASE/tabelaLogs.sql): ${erro.message}`);
    }
  }
}

/*
 * Regras: [método, caminho (regex), módulo, ação, entidade, frase(ctx), idEntidade(ctx)?]
 * ctx = { m: grupos do regex, b: corpo enviado, r: resposta do Back }
 */
const N = '(\\d+)';
const REGRAS = [
  // ---------- pedidos ----------
  ['POST', `^/pedidos$`, 'pedidos', 'pedido_criado', 'pedido',
    ({ r, b }) => `Criou o pedido nº ${r.id}${b.liberacao ? ' (cliente devendo, com liberação do financeiro)' : ''}`, ({ r }) => r.id],
  ['PUT', `^/pedidos/${N}$`, 'pedidos', 'pedido_editado', 'pedido', ({ m }) => `Editou os dados do pedido nº ${m[1]}`],
  ['PUT', `^/pedidos/${N}/status$`, ({ b }) => ([2, 3].includes(Number(b.status)) ? 'producao' : 'pedidos'), 'pedido_status', 'pedido',
    ({ m, b }) => `Pedido nº ${m[1]}: status mudou para "${STATUS[b.status] ?? b.status}"`],
  ['PUT', `^/pedidos/${N}/desconto$`, 'pedidos', 'pedido_desconto', 'pedido',
    ({ m, b, r }) => (b.tipo
      ? `Deu desconto de ${b.tipo === 'percentual' ? `${b.valor}%` : moeda(b.valor)} no pedido nº ${m[1]} (${String(b.motivo ?? '').trim()}). Novo total: ${moeda(r.total)}`
      : `Tirou o desconto do pedido nº ${m[1]}. Total: ${moeda(r.total)}`)],
  ['DELETE', `^/pedidos/${N}$`, 'pedidos', 'pedido_cancelado', 'pedido', ({ m }) => `Cancelou o pedido nº ${m[1]}`],
  ['POST', `^/pedidos/${N}/itens$`, 'pedidos', 'item_adicionado', 'pedido',
    ({ m, b }) => `Adicionou item ao pedido nº ${m[1]} (${b.quantidade ?? 1} un.)`],
  ['PUT', `^/pedidos/${N}/itens/${N}$`, 'pedidos', 'item_alterado', 'pedido',
    ({ m, b }) => `Alterou a quantidade de um item do pedido nº ${m[1]} para ${b.quantidade}`],
  ['DELETE', `^/pedidos/${N}/itens/${N}$`, 'pedidos', 'item_removido', 'pedido', ({ m }) => `Removeu um item do pedido nº ${m[1]}`],
  ['POST', `^/pedidos/${N}/anexos$`, 'pedidos', 'anexo_enviado', 'pedido', ({ m }) => `Anexou arquivo ao pedido nº ${m[1]}`],
  ['DELETE', `^/anexos/${N}$`, 'pedidos', 'anexo_removido', 'anexo', ({ m }) => `Removeu o anexo nº ${m[1]}`],
  // ---------- produção e conferência ----------
  ['POST', `^/pedidos/${N}/apontamentos$`, 'producao', 'producao_iniciada', 'pedido', ({ m }) => `Iniciou a produção do pedido nº ${m[1]}`],
  ['PUT', `^/apontamentos/${N}/concluir$`, 'producao', 'producao_concluida', 'apontamento',
    ({ m, b, r }) => `Concluiu o apontamento nº ${m[1]}${r.idPedido ? ` do pedido nº ${r.idPedido}` : ''} (${b.quantidadeProduzida ?? 0} peça(s))`],
  ['DELETE', `^/apontamentos/${N}$`, 'producao', 'producao_cancelada', 'apontamento', ({ m }) => `Cancelou o apontamento de produção nº ${m[1]}`],
  ['POST', `^/pedidos/${N}/conferencias$`, 'producao', 'conferencia', 'pedido',
    ({ m, b }) => `Conferência do pedido nº ${m[1]}: ${b.resultado === 'aprovado' ? 'aprovado' : 'devolvido para a produção'}${b.motivo ? ` (${String(b.motivo).trim().slice(0, 120)})` : ''}`],
  // ---------- financeiro ----------
  ['POST', `^/contas-pagar$`, 'financeiro', 'conta_pagar_criada', 'conta_pagar',
    ({ b }) => `Cadastrou a conta a pagar ${texto(b.descricao)} de ${moeda(b.valor)} (vence ${dia(b.dataVencimento)})`, ({ r }) => r.id],
  ['PUT', `^/contas-pagar/${N}$`, 'financeiro', 'conta_pagar_editada', 'conta_pagar', ({ m, b }) => `Editou a conta a pagar nº ${m[1]} ${texto(b.descricao)}`],
  ['DELETE', `^/contas-pagar/${N}$`, 'financeiro', 'conta_pagar_excluida', 'conta_pagar', ({ m }) => `Excluiu a conta a pagar nº ${m[1]}`],
  ['POST', `^/contas-pagar/${N}/pagar$`, 'financeiro', 'conta_paga', 'conta_pagar',
    ({ m, r, b }) => `Pagou a conta nº ${m[1]} ${texto(r.descricao)}: ${moeda(r.valor)} em ${FORMAS[b.formaPagamento] ?? b.formaPagamento}`],
  ['POST', `^/contas-pagar/${N}/estornar$`, 'financeiro', 'pagamento_estornado', 'conta_pagar', ({ m }) => `Desfez o pagamento da conta a pagar nº ${m[1]}`],
  ['POST', `^/contas-receber$`, 'financeiro', 'conta_receber_criada', 'conta_receber',
    ({ b }) => `Cadastrou a conta a receber ${texto(b.descricao)} de ${moeda(b.total)}`, ({ r }) => r.id],
  ['PUT', `^/contas-receber/${N}$`, 'financeiro', 'conta_receber_editada', 'conta_receber', ({ m }) => `Editou a conta a receber nº ${m[1]}`],
  ['DELETE', `^/contas-receber/${N}$`, 'financeiro', 'conta_receber_excluida', 'conta_receber', ({ m }) => `Excluiu a conta a receber nº ${m[1]}`],
  ['POST', `^/contas-receber/${N}/receber$`, 'financeiro', 'conta_recebida', 'conta_receber',
    ({ m, r, b }) => {
      const enc = Number(r.encargos?.multa ?? 0) + Number(r.encargos?.juros ?? 0);
      const pago = r.encargos?.valorPago ?? r.total;
      return `Recebeu ${moeda(pago)} da conta nº ${m[1]}${r.idPedido ? ` (pedido nº ${r.idPedido})` : ''} em ${FORMAS[b.formaPagamento] ?? b.formaPagamento}${enc > 0 ? `, com ${moeda(enc)} de multa e juros` : ''}${Number(r.restante) > 0 ? ` — faltam ${moeda(r.restante)}` : ''}`;
    }],
  ['POST', `^/contas-receber/${N}/estornar$`, 'financeiro', 'recebimento_estornado', 'conta_receber', ({ m }) => `Desfez o recebimento da conta nº ${m[1]}`],
  ['POST', `^/caixa$`, 'financeiro', 'caixa_lancamento', 'caixa',
    ({ b }) => `Lançou ${b.tipo === 'saida' ? 'saída' : 'entrada'} de ${moeda(b.valor)} no caixa (${String(b.descricao ?? '').trim().slice(0, 100)})`, ({ r }) => r.id],
  ['DELETE', `^/caixa/${N}$`, 'financeiro', 'caixa_lancamento_excluido', 'caixa', ({ m }) => `Excluiu o lançamento de caixa nº ${m[1]}`],
  ['POST', `^/caixa/fechar$`, 'financeiro', 'caixa_fechado', 'fechamento_caixa',
    ({ r, b }) => `Fechou o caixa de ${dia(r.data ?? b.data)}: contado ${moeda(r.dinheiroContado ?? b.dinheiroContado)}${r.diferenca !== undefined ? `, diferença ${moeda(r.diferenca)}` : ''}`, ({ r }) => r.id],
  // ---------- estoque ----------
  ['POST', `^/estoque$`, 'estoque', 'estoque_criado', 'estoque', ({ b }) => `Ativou o controle de estoque do produto nº ${b.idProduto}`, ({ r }) => r.id],
  ['PUT', `^/estoque/${N}$`, 'estoque', 'estoque_editado', 'estoque', ({ m }) => `Alterou mínimo/máximo do estoque nº ${m[1]}`],
  ['POST', `^/estoque/${N}/(entrada|saida|ajuste)$`, 'estoque', 'estoque_movimentado', 'estoque',
    ({ m, b }) => `${{ entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' }[m[2]]} de estoque nº ${m[1]}: ${b.quantidade ?? b.novoSaldo ?? ''}${b.motivo ? ` (${String(b.motivo).trim().slice(0, 100)})` : ''}`],
  ['DELETE', `^/estoque/${N}$`, 'estoque', 'estoque_excluido', 'estoque', ({ m }) => `Removeu o controle de estoque nº ${m[1]}`],
  // ---------- cadastros ----------
  ['POST', `^/usuarios$`, 'cadastros', 'usuario_criado', 'usuario', ({ b }) => `Cadastrou o usuário ${texto(b.login)}`, ({ r }) => r.id],
  ['PUT', `^/usuarios/${N}$`, 'cadastros', 'usuario_editado', 'usuario', ({ m }) => `Editou o usuário nº ${m[1]}`],
  ['PUT', `^/usuarios/${N}/senha$`, 'cadastros', 'usuario_senha', 'usuario', ({ m }) => `Trocou a senha do usuário nº ${m[1]}`],
  ['DELETE', `^/usuarios/${N}$`, 'cadastros', 'usuario_excluido', 'usuario', ({ m }) => `Excluiu/desativou o usuário nº ${m[1]}`],
  ['(POST|PUT|DELETE)', `^/usuario-tela(/${N})?$`, 'cadastros', 'permissao_alterada', 'usuario',
    ({ b }) => `Alterou permissões de tela${b.idUsuario ? ` do usuário nº ${b.idUsuario}` : ''}${b.tela ? ` (${b.tela})` : ''}`, ({ b }) => b.idUsuario],
  ['POST', `^/clientes$`, 'cadastros', 'cliente_criado', 'cliente', ({ b }) => `Cadastrou o cliente ${texto(b.nome)}`, ({ r }) => r.id],
  ['PUT', `^/clientes/${N}$`, 'cadastros', 'cliente_editado', 'cliente', ({ m, b }) => `Editou o cliente nº ${m[1]} ${texto(b.nome)}`],
  ['DELETE', `^/clientes/${N}$`, 'cadastros', 'cliente_excluido', 'cliente', ({ m }) => `Excluiu/inativou o cliente nº ${m[1]}`],
  ['POST', `^/(produtos|servicos)$`, 'cadastros', 'catalogo_criado', 'catalogo',
    ({ m, b }) => `Cadastrou o ${m[1] === 'produtos' ? 'produto' : 'serviço'} ${texto(b.nome)}`, ({ r }) => r.id],
  ['PUT', `^/(produtos|servicos)/${N}$`, 'cadastros', 'catalogo_editado', 'catalogo',
    ({ m, b }) => `Editou o ${m[1] === 'produtos' ? 'produto' : 'serviço'} nº ${m[2]} ${texto(b.nome)}`, ({ m }) => m[2]],
  ['DELETE', `^/(produtos|servicos)/${N}$`, 'cadastros', 'catalogo_excluido', 'catalogo',
    ({ m }) => `Excluiu o ${m[1] === 'produtos' ? 'produto' : 'serviço'} nº ${m[2]}`, ({ m }) => m[2]],
].map(([metodo, caminho, modulo, acao, entidade, frase, idEntidade]) => ({
  metodo: new RegExp(`^${metodo}$`),
  caminho: new RegExp(caminho),
  modulo,
  acao,
  entidade,
  frase,
  idEntidade: idEntidade ?? (({ m }) => m[1]),
}));

// Rotas que o middleware não registra (o login/saída tem log próprio; clientes-cpf/cnpj vão junto do cliente)
const IGNORAR = /^\/(login|clientes-cpf|clientes-cnpj)(\/|$)/;

function auditoria(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const caminho = req.path.replace(/\/+$/, '') || '/';
  const ip = ipDe(req); // pega agora: depois da resposta a conexão pode já ter fechado
  if (IGNORAR.test(caminho)) return next();

  // guarda a resposta para montar a frase (ex.: id do pedido criado)
  const jsonOriginal = res.json.bind(res);
  res.json = (corpo) => {
    res.locals.corpoResposta = corpo;
    return jsonOriginal(corpo);
  };

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const regra = REGRAS.find((r) => r.metodo.test(req.method) && r.caminho.test(caminho));
    const ctx = { m: regra ? caminho.match(regra.caminho) : [], b: req.body ?? {}, r: res.locals.corpoResposta ?? {} };
    let dados;
    try {
      dados = regra
        ? {
            modulo: typeof regra.modulo === 'function' ? regra.modulo(ctx) : regra.modulo,
            acao: regra.acao,
            entidade: regra.entidade,
            descricao: regra.frase(ctx),
            idEntidade: regra.idEntidade(ctx),
          }
        : { modulo: 'sistema', acao: 'operacao', descricao: `${req.method} ${caminho}` };
    } catch {
      dados = { modulo: 'sistema', acao: regra?.acao ?? 'operacao', descricao: `${req.method} ${caminho}` };
    }
    registrarLog(req, { ...dados, ip });
  });
  next();
}

module.exports = { registrarLog, auditoria, STATUS };
