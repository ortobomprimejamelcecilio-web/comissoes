'use client'

import { useMemo, useRef, useState } from 'react'
import { calcularMes, calcularINSS, calcularDiasUteis, formatCurrency, formatPercent } from '@/lib/commission'
import { Printer } from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const FAIXAS_INSS = [
  { faixa: 'Até R$ 1.518,00',            aliquota: '7,5%' },
  { faixa: 'R$ 1.518,01 a R$ 2.793,88',  aliquota: '9,0%' },
  { faixa: 'R$ 2.793,89 a R$ 4.190,83',  aliquota: '12,0%' },
  { faixa: 'R$ 4.190,84 a R$ 8.157,41',  aliquota: '14,0%' },
]

interface Parametros {
  meta: number; salario_base: number; beneficio: number
  perc_comissao_base: number; perc_comissao_extra: number
  perc_premiacao: number; limite_desconto: number
}
interface DadosVendedor {
  nome: string
  vendas: { valor_venda: number; preco_tabela: number }[]
  parametros: Parametros
}

export default function ContrachequeClient({ vendedores, mes, ano }: {
  vendedores: DadosVendedor[]
  mes: number
  ano: number
}) {
  const [abaAtiva, setAbaAtiva] = useState(0)
  const printRef = useRef<HTMLDivElement>(null)

  const atual = vendedores[abaAtiva]

  const hoje = new Date()
  const diaAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano ? hoje.getDate() : 30
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const diasUteis = calcularDiasUteis(mes, ano)

  const resultado = useMemo(() => {
    const vendasCalc = atual.vendas.map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))
    return calcularMes(vendasCalc, diaAtual, diasNoMes, atual.parametros)
  }, [atual, diaAtual, diasNoMes])

  // baseINSS = salário_base + comissão_base (2%) apenas — benefício e extras NÃO entram
  const baseINSS = resultado.baseINSS
  const inss = resultado.inss
  const totalBruto = resultado.totalBruto
  const totalLiquido = resultado.totalLiquido
  const aliquotaEfetiva = baseINSS > 0 ? inss / baseINSS : 0

  function handlePrint() {
    const conteudo = printRef.current?.innerHTML ?? ''
    const janela = window.open('', '_blank')
    if (!janela) return
    janela.document.write(`
      <html><head>
        <title>Contracheque — ${atual.nome} — ${MESES[mes-1]}/${ano}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20px; }
          .holerite { max-width: 680px; margin: 0 auto; border: 2px solid #000; }
          .h-header { background: #1e293b; color: #fff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
          .h-header h2 { font-size: 16px; font-weight: bold; }
          .h-header p { font-size: 11px; opacity: 0.7; margin-top: 2px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; }
          .info-cell { padding: 7px 12px; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; }
          .info-cell:nth-child(2n) { border-right: none; }
          .info-cell label { font-size: 9px; color: #666; text-transform: uppercase; display: block; }
          .info-cell span { font-weight: bold; font-size: 12px; }
          .sec { padding: 5px 12px; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; }
          .sec.prov { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
          .sec.desc { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
          .row { display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #f5f5f5; }
          .row span { font-size: 11px; }
          .row .val { font-weight: 700; }
          .row .val.verde { color: #15803d; }
          .row .val.vermelho { color: #dc2626; }
          .row.dim { opacity: 0.35; }
          .subtotal { display: flex; justify-content: space-between; padding: 7px 12px; background: #f8fafc; border-top: 1px solid #ccc; }
          .subtotal span { font-size: 12px; font-weight: bold; }
          .liquido { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; border-top: 2px solid #000; background: #f0fdf4; }
          .liquido .label p { font-size: 11px; font-weight: bold; }
          .liquido .label small { font-size: 9px; color: #555; }
          .liquido .valor { font-size: 26px; font-weight: 900; color: #15803d; }
          .inss-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 6px 12px; background: #fef2f2; }
          .inss-row { display: flex; justify-content: space-between; background: #fff; padding: 3px 6px; border: 1px solid #fecaca; font-size: 10px; }
          .inss-row .ali { font-weight: bold; color: #dc2626; }
          .meta-bar { padding: 8px 12px; background: #eff6ff; border-top: 1px solid #bfdbfe; }
          .meta-info { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px; }
          .bar-bg { height: 6px; background: #dbeafe; border-radius: 3px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 3px; }
          .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 16px 18px 10px; }
          .ass { border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10px; }
          .rodape { text-align: center; padding: 8px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; }
          @media print { body { padding: 0; } }
        </style>
      </head><body>${conteudo}</body></html>
    `)
    janela.document.close()
    janela.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Contracheque</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            {MESES[mes-1]} de {ano} — {diasUteis} dias úteis · benefício {formatCurrency(atual.parametros.beneficio)}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-2)',
            color: 'var(--text-1)',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>

      {/* Abas por vendedor */}
      <div className="flex gap-2">
        {vendedores.map((v, i) => (
          <button
            key={v.nome}
            onClick={() => setAbaAtiva(i)}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: abaAtiva === i ? 'var(--accent-dim)' : 'var(--surface-2)',
              color: abaAtiva === i ? 'var(--accent-fg)' : 'var(--text-2)',
            }}
          >
            {v.nome}
          </button>
        ))}
      </div>

      {/* Holerite — wrapper dark para contraste, o holerite interno é branco para impressão */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface)' }}
      >
        <div ref={printRef}>
          <div className="holerite bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden max-w-2xl">

            {/* Cabeçalho */}
            <div className="h-header p-5 flex items-center justify-between" style={{ background: '#1e293b' }}>
              <div>
                <h2 className="text-xl font-bold text-white">CONTRACHEQUE</h2>
                <p className="text-blue-200 text-sm">{MESES[mes-1].toUpperCase()} / {ano}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold text-sm">ComissãoSys</p>
                <p className="text-blue-300 text-xs">Sistema de Comissionamento</p>
              </div>
            </div>

            {/* Dados do Funcionário */}
            <div className="info-grid grid grid-cols-2 border-b border-gray-200">
              <InfoCell label="Funcionário" value={atual.nome.toUpperCase()} />
              <InfoCell label="Competência" value={`${MESES[mes-1]} / ${ano}`} />
              <InfoCell label="Cargo" value="VENDEDOR(A)" />
              <InfoCell label="Total de Vendas" value={formatCurrency(resultado.totalVendas)} />
            </div>

            {/* PROVENTOS */}
            <div className="sec prov px-5 py-2 text-xs font-bold uppercase tracking-wider border-y bg-green-50 text-green-800 border-green-200">
              PROVENTOS
            </div>

            <div className="divide-y divide-gray-50">
              <RubricaRow desc="Salário Base (Salário Mínimo 2026)" valor={formatCurrency(atual.parametros.salario_base)} tipo="provento" />
              <RubricaRow
                desc={`Benefício (${diasUteis} dias úteis × R$ 17,20)`}
                valor={formatCurrency(atual.parametros.beneficio)}
                tipo="provento"
              />
              <RubricaRow
                desc={`Comissão Base (2% × ${formatCurrency(resultado.totalVendas)})`}
                valor={formatCurrency(resultado.totalComissaoBase)}
                tipo="provento"
              />
              <RubricaRow
                desc={`Comissão Extra (+1% — desc. < ${Math.round(atual.parametros.limite_desconto * 100)}%)`}
                valor={formatCurrency(resultado.totalComissaoExtraDesconto)}
                tipo="provento"
              />
              <RubricaRow
                desc={`Premiação de Meta (+1%)${resultado.totalVendas >= atual.parametros.meta ? ' ✅' : ` — falta ${formatCurrency(Math.max(0, atual.parametros.meta - resultado.totalVendas))}`}`}
                valor={formatCurrency(resultado.premiacao)}
                tipo="provento"
                dim={resultado.premiacao === 0}
              />
            </div>

            <div className="subtotal flex justify-between px-5 py-2.5 bg-gray-50 border-y border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Total Bruto</span>
              <span className="font-bold text-gray-900">{formatCurrency(totalBruto)}</span>
            </div>

            {/* DESCONTOS */}
            <div className="sec desc px-5 py-2 text-xs font-bold uppercase tracking-wider border-y bg-red-50 text-red-800 border-red-200">
              DESCONTOS
            </div>

            <div>
              <RubricaRow
                desc={`INSS Progressivo — Base: salário + comissão base = ${formatCurrency(baseINSS)} | Alíq. efetiva: ${formatPercent(aliquotaEfetiva)}`}
                valor={formatCurrency(inss)}
                tipo="desconto"
              />
            </div>

            <div className="inss-grid px-5 py-3 bg-red-50/50">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide" style={{ gridColumn: '1/-1' }}>Tabela INSS (Progressiva)</p>
              {FAIXAS_INSS.map((f, i) => (
                <div key={i} className="inss-row flex justify-between text-xs bg-white px-2 py-1 rounded border border-red-100">
                  <span className="text-gray-600">{f.faixa}</span>
                  <span className="font-bold text-red-600 ali">{f.aliquota}</span>
                </div>
              ))}
            </div>

            {/* TOTAL LÍQUIDO */}
            <div className="liquido px-5 py-4 border-t-2 border-gray-900 flex items-center justify-between bg-gradient-to-r from-green-50 to-white">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Líquido a Receber</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(totalBruto)} bruto — {formatCurrency(inss)} INSS</p>
              </div>
              <p className="valor text-3xl font-black text-green-600">{formatCurrency(totalLiquido)}</p>
            </div>

            {/* % Meta */}
            <div className="meta-bar px-5 py-3 bg-blue-50 border-t border-blue-100">
              <div className="meta-info flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">% Meta — {formatCurrency(atual.parametros.meta)}</span>
                <span className={`font-bold ${resultado.totalVendas >= atual.parametros.meta ? 'text-green-600' : 'text-blue-600'}`}>
                  {formatPercent(resultado.totalVendas / atual.parametros.meta)}
                  {resultado.totalVendas >= atual.parametros.meta ? ' 🎉' : ''}
                </span>
              </div>
              <div className="bar-bg mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="bar-fill h-full rounded-full"
                  style={{
                    width: `${Math.min((resultado.totalVendas / atual.parametros.meta) * 100, 100)}%`,
                    background: resultado.totalVendas >= atual.parametros.meta ? '#16a34a' : '#2563eb',
                  }}
                />
              </div>
            </div>

            {/* Assinaturas */}
            <div className="assinaturas grid grid-cols-2 gap-8 px-5 py-6 border-t border-gray-200">
              <div className="ass text-center">
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-600 font-medium">Assinatura do Funcionário</p>
                  <p className="text-xs text-gray-400 mt-0.5">{atual.nome.toUpperCase()}</p>
                </div>
              </div>
              <div className="ass text-center">
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-600 font-medium">Assinatura do Empregador</p>
                  <p className="text-xs text-gray-400 mt-0.5">DATA: ___/___/______</p>
                </div>
              </div>
            </div>

            <div className="rodape px-5 py-2 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-xs text-gray-400">ComissãoSys — {MESES[mes-1]}/{ano} — Confidencial</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-cell px-5 py-3 border-r last:border-r-0 border-b border-gray-100">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function RubricaRow({ desc, valor, tipo, dim }: {
  desc: string; valor: string; tipo: 'provento' | 'desconto'; dim?: boolean
}) {
  return (
    <div className={`row flex justify-between items-start px-5 py-2.5 ${dim ? 'dim opacity-40' : ''}`}>
      <span className="text-sm text-gray-700 flex-1 pr-4">{desc}</span>
      <span className={`val text-sm font-bold whitespace-nowrap ${tipo === 'provento' ? 'verde text-green-700' : 'vermelho text-red-600'}`}>
        {tipo === 'desconto' ? '- ' : ''}{valor}
      </span>
    </div>
  )
}
