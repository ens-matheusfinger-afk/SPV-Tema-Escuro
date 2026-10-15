// Cabeçalho padrão das telas (REQ031). "children" = botões de ação à direita.
export default function PageHeader({ titulo, subtitulo, children }) {
  return (
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
      <div>
        <h1 className="h4 fw-bold mb-1">{titulo}</h1>
        {subtitulo && <p className="text-secondary mb-0">{subtitulo}</p>}
      </div>
      {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
