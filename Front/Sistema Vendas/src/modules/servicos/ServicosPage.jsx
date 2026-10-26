import { useState } from 'react'
import { Button, Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import ServicoFormModal from './ServicoFormModal'
import { useCarregar } from '../../hooks/useCarregar'
import { useNotificacao } from '../../hooks/useNotificacao'
import {
  atualizarServico,
  criarServico,
  excluirServico,
  listarServicos,
} from '../../services/servicosService'
import { formatarDuracao, formatarMoeda, normalizarBusca } from '../../utils/formatters'

// SPV-63 — cadastro de serviços (lista, busca, cadastro, edição e exclusão)
export default function ServicosPage() {
  const notificar = useNotificacao()
  const { dados: servicos, carregando, erro, recarregar } = useCarregar(listarServicos, [])

  const [busca, setBusca] = useState('')
  const [formulario, setFormulario] = useState(null) // { servico } (servico null = novo)
  const [excluindo, setExcluindo] = useState(null)

  const termo = normalizarBusca(busca)
  const lista = servicos ?? []
  const visiveis = lista.filter(
    (s) =>
      !termo ||
      normalizarBusca(s.nome).includes(termo) ||
      normalizarBusca(s.descricao).includes(termo),
  )

  const salvar = async (valores) => {
    const editado = formulario.servico
    if (editado) {
      await atualizarServico(editado.id, valores)
      notificar(`Serviço ${valores.nome.trim()} atualizado.`)
    } else {
      await criarServico(valores)
      notificar(`Serviço ${valores.nome.trim()} cadastrado.`)
    }
    setFormulario(null)
    await recarregar(true)
  }

  return (
    <>
      <PageHeader titulo="Serviços" subtitulo="Serviços oferecidos, com valor e duração estimada">
        <Button onClick={() => setFormulario({ servico: null })}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Novo serviço
        </Button>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      <div className="spv-card">
        <div className="spv-card-body border-bottom">
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search" aria-hidden="true"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder="Buscar por nome ou descrição"
              aria-label="Buscar serviços"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </InputGroup>
        </div>

        {carregando ? (
          <Carregando texto="Carregando serviços..." />
        ) : visiveis.length === 0 ? (
          <EstadoVazio icone="bi-tools" titulo="Nenhum serviço encontrado.">
            {lista.length === 0
              ? 'Cadastre o primeiro serviço no botão "Novo serviço".'
              : 'Ajuste a busca.'}
          </EstadoVazio>
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th className="text-end">Valor</th>
                  <th className="d-none d-sm-table-cell">Duração estimada</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="fw-semibold">{s.nome}</div>
                      {s.descricao && (
                        <div
                          className="small text-secondary text-truncate"
                          style={{ maxWidth: 360 }}
                        >
                          {s.descricao}
                        </div>
                      )}
                    </td>
                    <td className="text-end fw-semibold text-nowrap">{formatarMoeda(s.valor)}</td>
                    <td className="d-none d-sm-table-cell text-nowrap">
                      {s.duracaoEstimada == null ? (
                        <span className="text-secondary">—</span>
                      ) : (
                        <>
                          <i className="bi bi-clock me-1 text-secondary" aria-hidden="true"></i>
                          {formatarDuracao(s.duracaoEstimada)}
                        </>
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-1"
                        onClick={() => setFormulario({ servico: s })}
                      >
                        <i className="bi bi-pencil" aria-hidden="true"></i>
                        <span className="d-none d-lg-inline ms-1">Editar</span>
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => setExcluindo(s)}>
                        <i className="bi bi-trash" aria-hidden="true"></i>
                        <span className="d-none d-lg-inline ms-1">Excluir</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {servicos && (
          <div className="px-3 py-2 small text-secondary border-top">
            {visiveis.length} de {lista.length} serviço(s)
          </div>
        )}
      </div>

      {formulario && (
        <ServicoFormModal
          key={formulario.servico?.id ?? 'novo'}
          servico={formulario.servico}
          servicosExistentes={lista}
          aoSalvar={salvar}
          aoFechar={() => setFormulario(null)}
        />
      )}

      <ConfirmModal
        aberto={Boolean(excluindo)}
        titulo="Excluir serviço"
        textoConfirmar="Excluir"
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={async () => {
          await excluirServico(excluindo.id)
          notificar(`Serviço ${excluindo.nome} excluído.`)
          await recarregar(true)
        }}
      >
        <p className="mb-0">
          Excluir <strong>{excluindo?.nome}</strong>? Essa ação não pode ser desfeita. Serviços que
          já estão em pedidos não podem ser excluídos.
        </p>
      </ConfirmModal>
    </>
  )
}
