import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'

import { AuthProvider } from './context/AuthProvider'
import { NotificacaoProvider } from './context/NotificacaoProvider'
import App from './App.jsx'

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
