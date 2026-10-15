import { Link } from 'react-router-dom'

// REQ002 — mostrado quando o usuário tenta abrir uma tela que não foi liberada para ele
export default function SemPermissaoPage() {
  return (
    <div className="spv-card p-5 text-center">
      <i className="bi bi-shield-lock fs-1 text-secondary" aria-hidden="true"></i>
      <h1 className="h5 fw-bold mt-3">Acesso não permitido</h1>
      <p className="text-secondary mb-4">
        Seu usuário não tem permissão para esta tela. Se precisar dela, fale com o administrador.
      </p>
      <Link to="/" className="btn btn-primary">
        Ir para o início
      </Link>
    </div>
  )
}
