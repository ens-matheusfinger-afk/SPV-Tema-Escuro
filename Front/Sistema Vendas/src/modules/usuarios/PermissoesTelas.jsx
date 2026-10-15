import { Form } from 'react-bootstrap'
import { GRUPOS_DE_TELAS, PERFIS } from '../../utils/constants'

/*
 * Caixas de seleção das telas que o usuário pode acessar (REQ002).
 * "travadas" = telas que não podem ser desmarcadas (ex.: o admin tirando o próprio acesso a Usuários).
 */
export default function PermissoesTelas({ telas, aoMudar, travadas = [], invalido }) {
  const alternar = (tela) =>
    aoMudar(telas.includes(tela) ? telas.filter((t) => t !== tela) : [...telas, tela])

  const aplicarPerfil = (chave) => {
    if (!chave) return
    aoMudar([...new Set([...PERFIS[chave].telas, ...travadas])])
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
        <Form.Group controlId="aplicar-perfil" className="flex-grow-1">
          <Form.Label>Preencher com um perfil</Form.Label>
          <Form.Select value="" onChange={(e) => aplicarPerfil(e.target.value)}>
            <option value="">Escolha um perfil para marcar as telas...</option>
            {Object.entries(PERFIS).map(([chave, p]) => (
              <option key={chave} value={chave}>
                {p.nome}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <button
          type="button"
          className="btn btn-sm btn-link"
          onClick={() => aoMudar([...travadas])}
        >
          Desmarcar todas
        </button>
      </div>

      <div className={`row g-3 ${invalido ? 'text-danger' : ''}`}>
        {GRUPOS_DE_TELAS.map(({ grupo, telas: lista }) => (
          <fieldset key={grupo} className="col-sm-6">
            <legend className="spv-dado-rotulo">{grupo}</legend>
            {lista.map(([tela, rotulo]) => (
              <Form.Check
                key={tela}
                type="switch"
                id={`tela-${tela}`}
                label={rotulo}
                checked={telas.includes(tela)}
                disabled={travadas.includes(tela)}
                title={
                  travadas.includes(tela)
                    ? 'Você não pode remover este acesso de si mesmo.'
                    : undefined
                }
                onChange={() => alternar(tela)}
              />
            ))}
          </fieldset>
        ))}
      </div>
      {invalido && (
        <div className="small text-danger mt-2">Libere pelo menos uma tela para o usuário.</div>
      )}
    </>
  )
}
