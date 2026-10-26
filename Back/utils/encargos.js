// SPV-73 — multa e juros de conta a receber paga com atraso
// Regra: multa de 2% (uma vez) + juros de 1% ao mês, proporcional aos dias de atraso (1%/30 por dia).
// Só vale para conta VENCIDA de verdade (a mesma regra da inadimplência - SPV-118):
// conta avulsa, ou de pedido já entregue (status 5). Pedido ainda não entregue com a data de
// entrega vencida é atraso da empresa, não do cliente: sem multa.
const MULTA_PERCENTUAL = 2;
const JUROS_MES_PERCENTUAL = 1;

const centavos = (v) => Math.round(Number(v ?? 0) * 100);

function diasEntre(de, ate) {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

// conta: { total, dataPrevisao, idPedido }  statusPedido: status do pedido (ou null)  dia: data do pagamento
function calcularEncargos(conta, statusPedido, dia) {
  const valor = centavos(conta.total);
  const vencimento = conta.dataPrevisao ? String(conta.dataPrevisao).slice(0, 10) : null;
  const dias = vencimento ? diasEntre(vencimento, dia) : 0;
  const contaDoCliente = !conta.idPedido || Number(statusPedido) === 5;
  if (dias <= 0 || !contaDoCliente) {
    return { diasAtraso: 0, multa: 0, juros: 0, totalAtualizado: valor / 100, fator: 1 };
  }
  const multa = Math.round((valor * MULTA_PERCENTUAL) / 100);
  const juros = Math.round((valor * JUROS_MES_PERCENTUAL * dias) / 3000);
  return {
    diasAtraso: dias,
    multa: multa / 100,
    juros: juros / 100,
    totalAtualizado: (valor + multa + juros) / 100,
    fator: 1 + MULTA_PERCENTUAL / 100 + (JUROS_MES_PERCENTUAL / 100) * (dias / 30),
  };
}

/*
 * Divide um pagamento entre o valor da conta (principal) e os encargos.
 * Pagou o total atualizado: quita a conta inteira. Pagou menos: abate o principal na proporção
 * (valor / fator) e o resto fica como multa e juros pagos; o principal que sobrar continua em aberto.
 */
function dividirPagamento(conta, encargos, valorPago) {
  const pago = centavos(valorPago);
  const total = centavos(conta.total);
  if (encargos.diasAtraso === 0) return { principal: pago / 100, multa: 0, juros: 0 };
  if (pago >= centavos(encargos.totalAtualizado)) {
    return { principal: total / 100, multa: encargos.multa, juros: encargos.juros };
  }
  const principal = Math.min(total, Math.round(pago / encargos.fator));
  const extras = pago - principal;
  const somaEncargos = centavos(encargos.multa) + centavos(encargos.juros);
  const multa = somaEncargos ? Math.round((extras * centavos(encargos.multa)) / somaEncargos) : 0;
  return { principal: principal / 100, multa: multa / 100, juros: (extras - multa) / 100 };
}

module.exports = { MULTA_PERCENTUAL, JUROS_MES_PERCENTUAL, calcularEncargos, dividirPagamento };
