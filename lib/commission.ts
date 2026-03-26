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
// FERIADOS NACIONAIS BRASILEIROS
// ============================================================

/** Algoritmo de Meeus/Jones/Butcher para calcular a data da Páscoa */
function calcularPascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

function somarDias(data: Date, dias: number): Date {
  const d = new Date(data)
  d.setDate(d.getDate() + dias)
  return d
}

function toKey(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

/**
 * Retorna o conjunto de feriados nacionais do ano no formato "MM-DD".
 * Inclui feriados fixos e móveis (Sexta-Santa, Corpus Christi).
 */
export function getFeriadosNacionais(ano: number): Set<string> {
  const feriados = new Set<string>()

  // Feriados fixos
  const fixos = [
    '01-01', // Confraternização Universal
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência
    '10-12', // Nossa Senhora Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '11-20', // Consciência Negra (nacional desde 2024)
    '12-25', // Natal
  ]
  fixos.forEach(f => feriados.add(f))

  // Feriados móveis (baseados na Páscoa)
  const pascoa = calcularPascoa(ano)
  const sextaSanta  = somarDias(pascoa, -2)  // Sexta-Feira Santa
  const corpusChristi = somarDias(pascoa, 60) // Corpus Christi

  feriados.add(toKey(sextaSanta))
  feriados.add(toKey(corpusChristi))

  return feriados
}

// ============================================================
// DIAS ÚTEIS E BENEFÍCIO MENSAL
// ============================================================

/**
 * Conta dias úteis (seg–sáb) do mês, excluindo feriados nacionais brasileiros.
 * Domingo nunca é dia útil.
 */
export function calcularDiasUteis(mes: number, ano: number): number {
  const totalDias = new Date(ano, mes, 0).getDate()
  const feriados = getFeriadosNacionais(ano)
  let diasUteis = 0

  for (let dia = 1; dia <= totalDias; dia++) {
    const diaSemana = new Date(ano, mes - 1, dia).getDay()
    if (diaSemana === 0) continue // domingo: sempre fora

    const key = `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (!feriados.has(key)) diasUteis++
  }

  return diasUteis
}

/** Benefício do mês = dias úteis (seg–sáb, sem feriados) × R$ 17,20 */
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
  baseINSS: number       // salário_base + comissão_base (2%) apenas
  inss: number
  totalBruto: number
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

  const totalComissaoBase = vendas.reduce((s, v) => s + v.valor * COMISSAO_BASE, 0)

  // Extra 1%: calculado sobre o total vendido quando desconto ponderado < limite
  const totalTabela = vendas.reduce((s, v) => s + v.precoTabela, 0)
  const descontoPonderado = totalTabela > 0 ? (totalTabela - totalVendas) / totalTabela : 0
  const totalComissaoExtraDesconto = descontoPonderado < limiteDesconto
    ? totalVendas * COMISSAO_EXTRA_DESCONTO
    : 0

  const premiacao = totalVendas >= metaMensal ? totalVendas * COMISSAO_PREMIACAO : 0
  const totalComissoes = totalComissaoBase + totalComissaoExtraDesconto + premiacao

  const salarioBase = params.salario_base ?? SALARIO_BASE
  const beneficio = params.beneficio ?? 0

  // ─── INSS incide APENAS sobre salário base + comissão base (2%) ───
  // Benefício, bônus de desconto (+1%) e premiação (+1%) são extras
  // e NÃO entram na base de cálculo do INSS.
  const baseINSS = salarioBase + totalComissaoBase
  const inss = calcularINSS(baseINSS)

  // Total bruto = tudo (salário + benefício + todas as comissões)
  const totalBruto = salarioBase + beneficio + totalComissoes
  const totalLiquido = totalBruto - inss

  const percAtingimento = totalVendas / metaMensal
  const faltaMeta = Math.max(0, metaMensal - totalVendas)

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
    baseINSS,
    inss,
    totalBruto,
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
