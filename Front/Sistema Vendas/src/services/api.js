import axios from 'axios'
import { fakeBackend } from '../mocks/fakeBackend'

/*
 * Instância única de acesso ao Back. Todo service usa esta instância.
 *
 * Padrão: usa o Back de verdade (Express + PostgreSQL). Em dev, "/api" é redirecionado
 * pelo Vite para http://localhost:3000 — o Back precisa estar rodando.
 *
 * Modo de teste (sem Back): crie o arquivo .env.local com
 *   VITE_USE_MOCK=true
 * e reinicie o "npm run dev". As requisições passam a ser respondidas pelo mock em
 * src/mocks/fakeBackend.js, que imita as rotas reais com dados de exemplo.
 */
export const USANDO_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  ...(USANDO_MOCK ? { adapter: fakeBackend } : {}),
})

// SPV-111: manda quem está logado em toda requisição, para o Back gravar no registro de logs
api.interceptors.request.use((config) => {
  try {
    const sessao = JSON.parse(sessionStorage.getItem('spv:sessao') || 'null')
    if (sessao?.id && !config.headers.has?.('X-Usuario-Id')) {
      config.headers.set('X-Usuario-Id', String(sessao.id))
    }
  } catch {
    // sem sessão (tela de login): segue sem o cabeçalho
  }
  return config
})

// Converte qualquer erro de requisição em uma frase para mostrar ao usuário (REQ039)
export function mensagemDeErro(
  erro,
  padrao = 'Não foi possível concluir a operação. Tente novamente.',
) {
  const resposta = erro?.response
  if (resposta?.data?.erro) {
    const texto = resposta.data.erro
    // Erros técnicos do banco não ajudam o usuário
    if (/validation error|cannot read properties|sequelize/i.test(texto)) return padrao
    return texto
  }
  if (resposta?.status === 404)
    return 'O servidor não encontrou esta função. Confira se o Back está atualizado.'
  if (erro?.code === 'ECONNABORTED') return 'O servidor demorou para responder. Tente novamente.'
  if (erro?.isAxiosError && !resposta)
    return 'Sem conexão com o servidor. Verifique se o Back está rodando.'
  if (erro instanceof Error && !erro.isAxiosError && erro.message) return erro.message
  return padrao
}

export default api
