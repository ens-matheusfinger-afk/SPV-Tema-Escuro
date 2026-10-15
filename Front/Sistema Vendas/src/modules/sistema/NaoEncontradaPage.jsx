import { Link } from 'react-router-dom'

export default function NaoEncontradaPage() {
  return (
    <div className="spv-card p-5 text-center">
      <i className="bi bi-signpost-split fs-1 text-secondary" aria-hidden="true"></i>
      <h1 className="h5 fw-bold mt-3">Página não encontrada</h1>
      <p className="text-secondary mb-4">O endereço digitado não existe no sistema.</p>
      <Link to="/" className="btn btn-primary">
        Ir para o início
      </Link>
    </div>
  )
}
