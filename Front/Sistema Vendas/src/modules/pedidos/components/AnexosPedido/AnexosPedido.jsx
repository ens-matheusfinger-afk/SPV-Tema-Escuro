import { useRef, useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import Carregando from '../../../../components/Carregando/Carregando'
import ConfirmModal from '../../../../components/ConfirmModal/ConfirmModal'
import { useCarregar } from '../../../../hooks/useCarregar'
import { useAuth } from '../../../../hooks/useAuth'
import { useNotificacao } from '../../../../hooks/useNotificacao'
import { mensagemDeErro } from '../../../../services/api'
import {
  ACCEPT,
  MAXIMO_POR_ENVIO,
  TAMANHO_MAXIMO_MB,
  enviarAnexos,
  listarAnexos,
  removerAnexo,
  validarArquivos,
} from '../../../../services/anexosService'
import { formatarDataHora, formatarTamanho } from '../../../../utils/formatters'
import './AnexosPedido.css'

const ICONES = {
  imagem: 'bi-file-earmark-image',
  pdf: 'bi-file-earmark-pdf',
  word: 'bi-file-earmark-word',
  excel: 'bi-file-earmark-excel',
  texto: 'bi-file-earmark-text',
  arquivo: 'bi-file-earmark',
}

/*
 * SPV-91 — fotos e arquivos do pedido (arte, medidas, comprovante...).
 * somenteLeitura: pedido cancelado — mostra os anexos, mas não deixa enviar nem remover.
 */
export default function AnexosPedido({ idPedido, somenteLeitura }) {
  const { usuario } = useAuth()
  const notificar = useNotificacao()
  const entrada = useRef(null)
  const {
    dados: anexos,
    carregando,
    erro,
    recarregar,
  } = useCarregar(() => listarAnexos(idPedido), [idPedido])
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [removendo, setRemovendo] = useState(null)

  const escolher = async (e) => {
    const arquivos = Array.from(e.target.files ?? [])
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (arquivos.length === 0) return
    const problema = validarArquivos(arquivos)
    if (problema) {
      setErroEnvio(problema)
      return
    }
    setEnviando(true)
    setErroEnvio('')
    try {
      await enviarAnexos(idPedido, usuario.id, arquivos)
      notificar(`${arquivos.length} arquivo(s) anexado(s).`)
      await recarregar(true)
    } catch (err) {
      setErroEnvio(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="spv-card">
      <div className="spv-card-header">
        <i className="bi bi-paperclip text-secondary" aria-hidden="true"></i>
        <h2>Anexos</h2>
        {anexos?.length > 0 && <span className="badge text-bg-light border">{anexos.length}</span>}
        {!somenteLeitura && (
          <>
            <input
              ref={entrada}
              type="file"
              multiple
              accept={ACCEPT}
              className="d-none"
              aria-label="Escolher arquivos para anexar"
              onChange={escolher}
            />
            <Button
              size="sm"
              variant="outline-primary"
              className="ms-auto"
              disabled={enviando}
              onClick={() => entrada.current?.click()}
            >
              {enviando ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <i className="bi bi-upload me-1" aria-hidden="true"></i>Anexar
                </>
              )}
            </Button>
          </>
        )}
      </div>
      <div className="spv-card-body">
        {erroEnvio && (
          <Alert
            variant="danger"
            className="small py-2"
            dismissible
            onClose={() => setErroEnvio('')}
          >
            {erroEnvio}
          </Alert>
        )}
        {erro && (
          <Alert variant="danger" className="small py-2">
            {erro}
          </Alert>
        )}

        {carregando ? (
          <Carregando texto="Carregando anexos..." />
        ) : anexos?.length ? (
          <ul className="spv-anexos">
            {anexos.map((a) => (
              <li key={a.id} className="spv-anexo">
                <a href={a.url} target="_blank" rel="noreferrer" className="spv-anexo-previa">
                  {a.categoria === 'imagem' ? (
                    <img src={a.url} alt={a.nome} loading="lazy" />
                  ) : (
                    <i className={`bi ${ICONES[a.categoria]}`} aria-hidden="true"></i>
                  )}
                </a>
                <div className="spv-anexo-info">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="spv-anexo-nome"
                    title={a.nome}
                  >
                    {a.nome}
                  </a>
                  <div className="spv-anexo-meta">
                    {formatarTamanho(a.tamanho)} · {formatarDataHora(a.dataEnvio)}
                    {a.enviadoPor && ` · ${a.enviadoPor}`}
                  </div>
                </div>
                <div className="spv-anexo-acoes">
                  <a
                    href={a.urlDownload}
                    download={a.nome}
                    className="btn btn-sm btn-light border"
                    title="Baixar"
                    aria-label={`Baixar ${a.nome}`}
                  >
                    <i className="bi bi-download" aria-hidden="true"></i>
                  </a>
                  {!somenteLeitura && (
                    <Button
                      size="sm"
                      variant="outline-danger"
                      title="Remover"
                      aria-label={`Remover ${a.nome}`}
                      onClick={() => setRemovendo(a)}
                    >
                      <i className="bi bi-trash" aria-hidden="true"></i>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small text-secondary mb-0">
            Nenhum arquivo anexado.
            {!somenteLeitura &&
              ` Fotos, PDF, Word, Excel ou texto — até ${TAMANHO_MAXIMO_MB} MB cada, ${MAXIMO_POR_ENVIO} por vez.`}
          </p>
        )}
      </div>

      <ConfirmModal
        aberto={Boolean(removendo)}
        titulo="Remover anexo"
        textoConfirmar="Remover"
        aoFechar={() => setRemovendo(null)}
        aoConfirmar={async () => {
          await removerAnexo(removendo.id)
          notificar(`Anexo ${removendo.nome} removido.`)
          await recarregar(true)
        }}
      >
        <p className="mb-0">
          Remover <strong>{removendo?.nome}</strong> deste pedido? O arquivo é apagado do servidor.
        </p>
      </ConfirmModal>
    </section>
  )
}
