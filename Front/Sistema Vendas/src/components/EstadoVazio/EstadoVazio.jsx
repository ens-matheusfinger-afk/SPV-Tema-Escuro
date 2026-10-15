// Mensagem para listas vazias ("Nenhum pedido encontrado")
export default function EstadoVazio({ icone = 'bi-inbox', titulo, children }) {
  return (
    <div className="text-center text-secondary py-5">
      <i className={`bi ${icone} fs-1`} aria-hidden="true"></i>
      <p className="fw-semibold mt-2 mb-1 text-body">{titulo}</p>
      {children && <div className="small">{children}</div>}
    </div>
  )
}
