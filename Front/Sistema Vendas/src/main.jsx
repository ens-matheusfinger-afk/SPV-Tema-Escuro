import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Fontes do tema v2 (instaladas pelo npm, funcionam sem internet)
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/jetbrains-mono'
import './index.css'

import { AuthProvider } from './context/AuthProvider'
import { NotificacaoProvider } from './context/NotificacaoProvider'
import { ativarTemaImpressao } from './utils/temaImpressao'
import App from './App.jsx'

ativarTemaImpressao()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <NotificacaoProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </NotificacaoProvider>
    </BrowserRouter>
  </StrictMode>,
)

/*
 * Tira a tela de carregamento (splash do index.html) depois que o sistema montou.
 * Fica no mínimo ~0,7 s na tela para a animação não "piscar" quando o carregamento é muito rápido.
 */
const TEMPO_MINIMO_SPLASH = 700
function esconderSplash() {
  const splash = document.getElementById('spv-splash')
  if (!splash) return
  const espera = Math.max(0, TEMPO_MINIMO_SPLASH - performance.now())
  setTimeout(() => {
    splash.classList.add('saindo')
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    setTimeout(() => splash.remove(), 1000) // garantia, caso a transição não dispare
  }, espera)
}
requestAnimationFrame(() => requestAnimationFrame(esconderSplash))
