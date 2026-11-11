import './PageHeader.css'

// Cabeçalho padrão das telas (REQ031). "children" = botões de ação à direita.
export default function PageHeader({ titulo, subtitulo, children }) {
  return (
    <div className="spv-page-header">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
