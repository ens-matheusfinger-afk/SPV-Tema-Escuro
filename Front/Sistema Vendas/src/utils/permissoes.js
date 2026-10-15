import { PERFIS } from './constants'

// Descobre qual perfil corresponde exatamente às telas do usuário (só para exibição)
export function nomeDoPerfil(telas = []) {
  const conjunto = [...telas].sort().join('|')
  const perfil = Object.values(PERFIS).find((p) => [...p.telas].sort().join('|') === conjunto)
  if (perfil) return perfil.nome
  return telas.length === 0 ? 'Sem acesso' : 'Personalizado'
}
