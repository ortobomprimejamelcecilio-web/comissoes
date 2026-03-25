// ============================================================
// REGRAS DE NEGÓCIO - COMISSIONAMENTO
// ============================================================

export const COMISSAO_BASE = 0.02          // 2% sobre cada venda
export const COMISSAO_EXTRA_DESCONTO = 0.01 // +1% se desconto < limite
export const COMISSAO_PREMIACAO = 0.01      // +1% se atingir meta
export const LIMITE_DESCONTO = 0.12        // 12% — padrão (Regiane)
export const META_MENSAL = 60000           // R$ 60.000
export const SALARIO_BASE = 1620           // Salário mínimo 2026
export const VALOR_DIA_UTIL = 17.20        // R$ 17,20 por dia útil (benefício)

// ============================================================
// DIAS ÚTEIS E BENEFÍCIO MENSAL
// ============================================================

/**
 * Conta os dias úteis (seg–sex) de um mês/ano.
 * Não inclui feriados nacionais (apenas fins de semana).
 */
export function calcularDiasUteis(mes: number, ano: number): number {
  const totalDias = new Date(ano, mes, 0).getDate()
  let diasUteis = 0
  for (let dia = 1; dia <= totalDias; dia++) {
    const diaSemana = new Date(ano, mes - 1, dia).getDay()
    if (diaSemana !== 0 && diaSemana !== 6) diasUteis++
  }
  return diasUteis
}

/** Benefício do mês = dias úteis × R$ 8,60 */
export function calcularBeneficio(mes: number, ano: number): number {
  return Math.round(calcularDiasUteis(mes, ano) * VALOR_DIA_UTIL * 100) / 100
}

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
export function calcularComissaoVenda(
  valorVenda: number,
  precoTabela: number,
  limiteDesconto: number = LIMITE_DESCONTO,
): {
  comissaoBase: number
  comissaoExtraDesconto: number
  percDesconto: number
  totalComissaoVenda: number
} {
  const percDesconto = precoTabela > 0 ? (precoTabela - valorVenda) / precoTabela : 0
  const comissaoBase = valorVenda * COMISSAO_BASE
  const comissaoExtraDesconto = percDesconto < limiteDesconto ? valorVenda * COMISSAO_EXTRA_DESCONTO : 0

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

export interface ParamsCalc {
  meta?: number
  salario_base?: number
  beneficio?: number
  limite_desconto?: number
}

export function calcularMes(
  vendas: VendaCalc[],
  diaAtual: number,
  totalDiasMes: number,
  params: ParamsCalc = {},
): ResultadoMensal {
  const metaMensal = params.meta ?? META_MENSAL
  const limiteDesconto = params.limite_desconto ?? LIMITE_DESCONTO

  const totalVendas = vendas.reduce((s, v) => s + v.valor, 0)

  let totalComissaoBase = 0
  let totalComissaoExtraDesconto = 0

  for (const v of vendas) {
    const calc = calcularComissaoVenda(v.valor, v.precoTabela, limiteDesconto)
    totalComissaoBase += calc.comissaoBase
    totalComissaoExtraDesconto += calc.comissaoExtraDesconto
  }

  const premiacao = totalVendas >= metaMensal ? totalVendas * COMISSAO_PREMIACAO : 0
  const totalComissoes = totalComissaoBase + totalComissaoExtraDesconto + premiacao

  const salarioBase = params.salario_base ?? SALARIO_BASE
  const beneficio = params.beneficio ?? 0

  // INSS incide sobre salário + comissões (não sobre benefício)
  const baseINSS = salarioBase + totalComissoes
  const inss = calcularINSS(baseINSS)

  const totalBruto = salarioBase + beneficio + totalComissoes
  const totalLiquido = totalBruto - inss

  const percAtingimento = totalVendas / metaMensal
  const faltaMeta = Math.max(0, metaMensal - totalVendas)

  // Projeção: ritmo atual × dias restantes
  const projecaoMes = diaAtual > 0 ? (totalVendas / diaAtual) * totalDiasMes : 0
  const percProjecao = projecaoMes / metaMensal

  return {
    totalVendas,
    metaMensal,
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
