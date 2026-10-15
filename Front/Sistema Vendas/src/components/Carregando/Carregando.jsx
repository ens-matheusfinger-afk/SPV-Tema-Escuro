import { Spinner } from 'react-bootstrap'

export default function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-secondary">
      <Spinner size="sm" />
      <span>{texto}</span>
    </div>
  )
}
