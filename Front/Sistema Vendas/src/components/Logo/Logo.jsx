// Marca Sys Vendas: nuvem (hospedagem) + etiqueta de pedido
export default function Logo({ tamanho = 36 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M18 46h30a11 11 0 0 0 1.6-21.9A15 15 0 0 0 20.3 21 12.5 12.5 0 0 0 18 46Z"
        stroke="#3DA7FD"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="25" y="30" width="14" height="18" rx="2.5" fill="#06D6A0" />
      <path
        d="M28.5 36h7M28.5 40h7M28.5 44h5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
