import { FATOR_CONFIANCA } from '../../services/clientesService'
import './ConfiancaCliente.css'

/*
 * SPV-119 — fator de confiança do cliente em estrelas (1 a 5) + nome do nível.
 * compacto: só as estrelas (o nome fica no title, ao passar o mouse).
 */
export default function ConfiancaCliente({ fator = 3, compacto = false }) {
  const nivel = FATOR_CONFIANCA[fator] ?? FATOR_CONFIANCA[3]
  const rotulo = `Confiança ${fator} de 5: ${nivel.nome}`
  return (
    <span className={`spv-confianca text-${nivel.cor}`} title={rotulo} aria-label={rotulo}>
      <span aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <i key={n} className={`bi ${n <= fator ? 'bi-star-fill' : 'bi-star'}`}></i>
        ))}
      </span>
      {!compacto && <span className="spv-confianca-nome">{nivel.nome}</span>}
    </span>
  )
}
