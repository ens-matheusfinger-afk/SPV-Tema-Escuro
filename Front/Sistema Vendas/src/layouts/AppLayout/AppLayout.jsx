import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import Topbar from '../Topbar/Topbar'
import './AppLayout.css'

// Estrutura de todas as telas logadas: menu lateral + barra superior + conteúdo
export default function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="spv-app">
      <Sidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
      <div className="spv-main">
        <Topbar aoAbrirMenu={() => setMenuAberto(true)} />
        <main className="spv-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
