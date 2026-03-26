// ============================================================
// CONFIGURAÇÃO CENTRAL DOS VENDEDORES
// Altere aqui para refletir em todo o sistema
// ============================================================

export const VENDEDORES_CONFIG = [
  {
    nome: 'Regiane',
    limiteDesconto: 0.12,   // 12%
    meta: 80000,            // R$ 80.000
  },
  {
    nome: 'Robson',
    limiteDesconto: 0.15,   // 15%
    meta: 60000,            // R$ 60.000
  },
] as const

export type VendedorNome = typeof VENDEDORES_CONFIG[number]['nome']

export function getVendedorConfig(nome: string) {
  return VENDEDORES_CONFIG.find(v => v.nome === nome) ?? VENDEDORES_CONFIG[0]
}
