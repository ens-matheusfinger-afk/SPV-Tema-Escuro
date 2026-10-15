import axios from 'axios'
import { fakeBackend } from '../mocks/fakeBackend'

/*
 * Instância única de acesso ao Back. Todo service usa esta instância.
 *
 * Modo de teste (padrão): as requisições são respondidas pelo mock em src/mocks/fakeBackend.js,
 * que imita as rotas reais. Para usar o Back de verdade, crie o arquivo .env.local com:
 *   VITE_USE_MOCK=false
 * e reinicie o "npm run dev". Em dev, "/api" é redirecionado para http://localhost:3000.
 */
export const USANDO_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  ...(USANDO_MOCK ? { adapter: fakeBackend } : {}),
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
