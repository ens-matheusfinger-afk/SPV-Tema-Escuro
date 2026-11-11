import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import Topbar from '../Topbar/Topbar'
import './AppLayout.css'

const CHAVE_RECOLHIDO = 'spv:menu-recolhido'

function lerRecolhido() {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDO) === '1'
  } catch {
    return false
  }
}

// Estrutura de todas as telas logadas: menu lateral flutuante + barra superior + conteúdo
export default function AppLayout() {
  // Celular: gaveta aberta/fechada
  const [menuAberto, setMenuAberto] = useState(false)
  // Desktop: menu completo ou só os ícones (preferência lembrada no navegador)
  const [recolhido, setRecolhido] = useState(lerRecolhido)

  const alterarRecolhido = (valor) => {
    setRecolhido(valor)
    try {
      localStorage.setItem(CHAVE_RECOLHIDO, valor ? '1' : '0')
    } catch {
      // navegador sem localStorage: só não lembra a preferência
    }
  }

  return (
    <div className={`spv-app${recolhido ? ' spv-recolhido' : ''}`}>
      <Sidebar
        aberto={menuAberto}
        aoFechar={() => setMenuAberto(false)}
        recolhido={recolhido}
        aoAlternarRecolhido={() => alterarRecolhido(!recolhido)}
        aoExpandir={() => alterarRecolhido(false)}
      />
      <div className="spv-main">
        <Topbar aoAbrirMenu={() => setMenuAberto(true)} />
        <main className="spv-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
