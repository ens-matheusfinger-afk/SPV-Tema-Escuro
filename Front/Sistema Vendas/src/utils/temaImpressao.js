/*
 * Impressão sempre no tema CLARO (REQ008).
 *
 * O sistema roda no tema escuro (data-bs-theme="dark" no <html>). Na hora de imprimir
 * (Ctrl+P ou window.print), texto claro em papel branco ficaria invisível, então o tema
 * é trocado para claro só durante a impressão e volta para o escuro logo depois.
 */
const html = document.documentElement

export function ativarTemaImpressao() {
  window.addEventListener('beforeprint', () => {
    html.dataset.temaTela = html.getAttribute('data-bs-theme') || 'dark'
    html.setAttribute('data-bs-theme', 'light')
  })

  window.addEventListener('afterprint', () => {
    html.setAttribute('data-bs-theme', html.dataset.temaTela || 'dark')
  })
}
