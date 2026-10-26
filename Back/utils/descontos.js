// SPV-73 — desconto no pedido: total = subtotal (soma dos itens) - desconto
// tipo 'valor' = desconto em R$; 'percentual' = % sobre o subtotal. Mesmo cálculo da trigger
// trg_pedidos_desconto (DATABASE/triggers.sql), então Back e banco chegam no mesmo número.
const centavos = (v) => Math.round(Number(v ?? 0) * 100);

function calcularTotalPedido({ subtotal, descontoTipo, descontoInformado }) {
  const sub = centavos(subtotal);
  let desconto = 0;
  if (descontoTipo === 'percentual') desconto = Math.round((sub * Number(descontoInformado ?? 0)) / 100);
  else if (descontoTipo === 'valor') desconto = Math.min(centavos(descontoInformado), sub);
  return { subtotal: sub / 100, valorDesconto: desconto / 100, total: (sub - desconto) / 100 };
}

module.exports = { calcularTotalPedido };
