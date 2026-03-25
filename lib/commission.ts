// ============================================================
// REGRAS DE NEGÓCIO - COMISSIONAMENTO
// ============================================================

export const COMISSAO_BASE = 0.02          // 2% sobre cada venda
export const COMISSAO_EXTRA_DESCONTO = 0.01 // +1% se desconto < 12%
export const COMISSAO_PREMIACAO = 0.01      // +1% se atingir meta
export const LIMITE_DESCONTO = 0.12        // 12% — limite p/ ganhar 1% extra
export const META_MENSAL = 60000           // R$ 60.000
export const SALARIO_BASE = 1518           // Salário mínimo 2025
export const BENEFICIO = 450              // Benefício fixo

// ============================================================
// TABELA INSS PROGRESSIVA 2025
// ============================================================
const FAIXAS_INSS = [
  { teto: 1518.00,  aliquota: 0.075 },
  { teto: 2793.88,  aliquota: 0.09  },
  { teto: 4190.83,  aliquota: 0.12  },
  { teto: 8157.41,  aliquota: 0.14  },
]

export function calcularINSS(baseCalculo: number): number {
  let inss = 0
  let baseRestante = baseCalculo
  let limiteAnterior = 0

  for (const faixa of FAIXAS_INSS) {
    if (baseRestante <= 0) break
    const faixaValor = faixa.teto - limiteAnterior
    const valorNaFaixa = Math.min(baseRestante, faixaValor)
    inss += valorNaFaixa * faixa.aliquota
    baseRestante -= valorNaFaixa
    limiteAnterior = faixa.teto
    if (baseCalculo <= faixa.teto) break
  }

  return Math.round(inss * 100) / 100
}

// ============================================================
// CÁLCULO DE COMISSÃO POR VENDA
// ============================================================
export function calcularComissaoVenda(valorVenda: number, precoTabela: number): {
  comissaoBase: number
  comissaoExtraDesconto: number
  percDesconto: number
  totalComissaoVenda: number
} {
  const percDesconto = precoTabela > 0 ? (precoTabela - valorVenda) / precoTabela : 0
  const comissaoBase = valorVenda * COMISSAO_BASE
  const comissaoExtraDesconto = percDesconto < LIMITE_DESCONTO ? valorVenda * COMISSAO_EXTRA_DESCONTO : 0

  return {
    comissaoBase,
    comissaoExtraDesconto,
    percDesconto,
    totalComissaoVenda: comissaoBase + comissaoExtraDesconto,
  }
}

// ============================================================
// CÁLCULO COMPLETO DO MÊS (CONTRACHEQUE)
// ============================================================
export interface VendaCalc {
  valor: number
  precoTabela: number
}

export interface ResultadoMensal {
  totalVendas: number
  metaMensal: number
  percAtingimento: number
  faltaMeta: number

  // Comissões
  totalComissaoBase: number
  totalComissaoExtraDesconto: number
  premiacao: number
  totalComissoes: number

  // Contracheque
  salarioBase: number
  beneficio: number
  totalBruto: number
  inss: number
  totalLiquido: number

  // Projeção
  projecaoMes: number
  percProjecao: number
}

export function calcularMes(vendas: VendaCalc[], diaAtual: number, totalDiasMes: number): ResultadoMensal {
  const totalVendas = vendas.reduce((s, v) => s + v.valor, 0)

  let totalComissaoBase = 0
  let totalComissaoExtraDesconto = 0

  for (const v of vendas) {
    const calc = calcularComissaoVenda(v.valor, v.precoTabela)
    totalComissaoBase += calc.comissaoBase
    totalComissaoExtraDesconto += calc.comissaoExtraDesconto
  }

  const premiacao = totalVendas >= META_MENSAL ? totalVendas * COMISSAO_PREMIACAO : 0
  const totalComissoes = totalComissaoBase + totalComissaoExtraDesconto + premiacao

  const salarioBase = SALARIO_BASE
  const beneficio = BENEFICIO

  // INSS incide sobre salário + comissões (não sobre benefício)
  const baseINSS = salarioBase + totalComissoes
  const inss = calcularINSS(baseINSS)

  const totalBruto = salarioBase + beneficio + totalComissoes
  const totalLiquido = totalBruto - inss

  const percAtingimento = totalVendas / META_MENSAL
  const faltaMeta = Math.max(0, META_MENSAL - totalVendas)

  // Projeção: ritmo atual × dias restantes
  const projecaoMes = diaAtual > 0 ? (totalVendas / diaAtual) * totalDiasMes : 0
  const percProjecao = projecaoMes / META_MENSAL

  return {
    totalVendas,
    metaMensal: META_MENSAL,
    percAtingimento,
    faltaMeta,
    totalComissaoBase,
    totalComissaoExtraDesconto,
    premiacao,
    totalComissoes,
    salarioBase,
    beneficio,
    totalBruto,
    inss,
    totalLiquido,
    projecaoMes,
    percProjecao,
  }
}

// ============================================================
// FORMATAÇÃO
// ============================================================
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}
