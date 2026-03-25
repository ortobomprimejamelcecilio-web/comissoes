'use client'

import { useMemo, useRef } from 'react'
import { calcularMes, calcularINSS, formatCurrency, formatPercent } from '@/lib/commission'
import { Printer, FileText } from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Tabela INSS 2025 para exibição
const FAIXAS_INSS = [
  { faixa: 'Até R$ 1.518,00',             aliquota: '7,5%' },
  { faixa: 'R$ 1.518,01 a R$ 2.793,88',   aliquota: '9,0%' },
  { faixa: 'R$ 2.793,89 a R$ 4.190,83',   aliquota: '12,0%' },
  { faixa: 'R$ 4.190,84 a R$ 8.157,41',   aliquota: '14,0%' },
]

interface Parametros {
  meta: number; salario_base: number; beneficio: number
  perc_comissao_base: number; perc_comissao_extra: number
  perc_premiacao: number; limite_desconto: number
}

export default function ContrachequeClient({ vendas, parametros, nomeVendedor, mes, ano }: {
  vendas: { valor_venda: number; preco_tabela: number }[]
  parametros: Parametros
  nomeVendedor: string
  mes: number; ano: number
}) {
  const printRef = useRef<HTMLDivElement>(null)

  const hoje = new Date()
  const diaAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano ? hoje.getDate() : 30
  const diasNoMes = new Date(ano, mes, 0).getDate()

  const resultado = useMemo(() => {
    const vendasCalc = vendas.map(v => ({ valor: v.valor_venda, precoTabela: v.preco_tabela }))
    const r = calcularMes(vendasCalc, diaAtual, diasNoMes)
    // Recalcular com parametros do banco
    const premiacao = r.totalVendas >= parametros.meta ? r.totalVendas * parametros.perc_premiacao : 0
    return { ...r, premiacao, metaMensal: parametros.meta }
  }, [vendas, parametros, diaAtual, diasNoMes])

  const baseINSS = parametros.salario_base + resultado.totalComissoes
  const inss = calcularINSS(baseINSS)
  const totalBruto = parametros.salario_base + parametros.beneficio + resultado.totalComissoes
  const totalLiquido = totalBruto - inss

  // Alíquota efetiva INSS
  const aliquotaEfetiva = baseINSS > 0 ? inss / baseINSS : 0

  function handlePrint() {
    const conteudo = printRef.current?.innerHTML ?? ''
    const janela = window.open('', '_blank')
    if (!janela) return
    janela.document.write(`
      <html><head>
        <title>Contracheque — ${nomeVendedor} — ${MESES[mes-1]}/${ano}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20px; }
          .holerite { max-width: 700px; margin: 0 auto; border: 2px solid #000; }
          .header { background: #1e293b; color: #fff; padding: 15px 20px; }
          .header h1 { font-size: 18px; font-weight: bold; }
          .header p { font-size: 12px; margin-top: 3px; opacity: 0.8; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #000; }
          .info-cell { padding: 8px 12px; border-right: 1px solid #ccc; }
          .info-cell:last-child { border-right: none; }
          .info-cell label { font-size: 10px; color: #666; text-transform: uppercase; display: block; }
          .info-cell span { font-weight: bold; font-size: 13px; }
          .section-title { background: #f1f5f9; padding: 6px 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; letter-spacing: 0.05em; color: #374151; }
          .rubrica { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f0f0f0; }
          .rubrica .desc { font-size: 12px; }
          .rubrica .valor { font-size: 12px; font-weight: 600; }
          .rubrica .valor.verde { color: #16a34a; }
          .rubrica .valor.vermelho { color: #dc2626; }
          .totais { padding: 10px 12px; background: #f8fafc; border-top: 2px solid #000; display: flex; justify-content: space-between; align-items: center; }
          .totais .label { font-size: 13px; font-weight: bold; }
          .totais .valor { font-size: 22px; font-weight: 900; color: #16a34a; }
          .footer { text-align: center; padding: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #666; }
          .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px 12px 10px; }
          .assinatura { border-top: 1px solid #000; padding-top: 6px; text-align: center; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head><body>${conteudo}</body></html>
    `)
    janela.document.close()
    janela.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracheque</h1>
          <p className="text-gray-500 text-sm">{MESES[mes-1]} de {ano} — {nomeVendedor}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm"
          style={{ background: '#1e293b' }}
        >
          <Printer className="w-4 h-4" />
          Imprimir Holerite
        </button>
      </div>

      {/* Holerite */}
      <div ref={printRef}>
        <div className="holerite bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden max-w-2xl">

          {/* Cabeçalho */}
          <div className="p-5" style={{ background: '#1e293b' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">CONTRACHEQUE</h2>
                <p className="text-blue-200 text-sm">{MESES[mes-1].toUpperCase()} / {ano}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold text-sm">ComissãoSys</p>
                <p className="text-blue-300 text-xs">Sistema de Comissionamento</p>
              </div>
            </div>
          </div>

          {/* Dados do Funcionário */}
          <div className="grid grid-cols-2 border-b border-gray-200">
            <InfoCell label="Funcionário" value={nomeVendedor.toUpperCase()} />
            <InfoCell label="Competência" value={`${MESES[mes-1]} / ${ano}`} />
            <InfoCell label="Cargo" value="VENDEDOR(A)" />
            <InfoCell label="Total de Vendas" value={formatCurrency(resultado.totalVendas)} />
          </div>

          {/* PROVENTOS */}
          <div className="section-title bg-green-50 text-green-800 px-5 py-2 text-xs font-bold uppercase tracking-wider border-y border-green-200">
            PROVENTOS
          </div>

          <div className="divide-y divide-gray-50">
            <RubricaRow desc="Salário Base (Salário Mínimo 2025)" valor={formatCurrency(parametros.salario_base)} tipo="provento" />
            <RubricaRow desc="Benefício" valor={formatCurrency(parametros.beneficio)} tipo="provento" />
            <RubricaRow desc={`Comissão Base (2% × ${formatCurrency(resultado.totalVendas)})`} valor={formatCurrency(resultado.totalComissaoBase)} tipo="provento" />
            <RubricaRow
              desc={`Comissão Extra Desconto (+1% — desc. abaixo de ${Math.round(parametros.limite_desconto * 100)}%)`}
              valor={formatCurrency(resultado.totalComissaoExtraDesconto)}
              tipo="provento"
            />
            <RubricaRow
              desc={`Premiação Atingimento de Meta (+1%) ${resultado.totalVendas >= parametros.meta ? '✅' : '—'}`}
              valor={formatCurrency(resultado.premiacao)}
              tipo="provento"
              dim={resultado.premiacao === 0}
            />
          </div>

          {/* Subtotal Bruto */}
          <div className="px-5 py-2 bg-gray-50 border-y border-gray-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total Bruto</span>
            <span className="font-bold text-gray-900">{formatCurrency(totalBruto)}</span>
          </div>

          {/* DESCONTOS */}
          <div className="section-title bg-red-50 text-red-800 px-5 py-2 text-xs font-bold uppercase tracking-wider border-y border-red-200">
            DESCONTOS
          </div>

          <div className="divide-y divide-gray-50">
            <RubricaRow
              desc={`INSS Progressivo — Base: ${formatCurrency(baseINSS)} | Alíquota efetiva: ${formatPercent(aliquotaEfetiva)}`}
              valor={formatCurrency(inss)}
              tipo="desconto"
            />
          </div>

          {/* Tabela INSS */}
          <div className="px-5 py-3 bg-red-50/50">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Tabela INSS 2025 (Progressiva)</p>
            <div className="grid grid-cols-2 gap-1">
              {FAIXAS_INSS.map((f, i) => (
                <div key={i} className="flex justify-between text-xs bg-white px-2 py-1 rounded border border-red-100">
                  <span className="text-gray-600">{f.faixa}</span>
                  <span className="font-bold text-red-600">{f.aliquota}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TOTAL LÍQUIDO */}
          <div className="px-5 py-4 border-t-2 border-gray-900 flex items-center justify-between bg-gradient-to-r from-green-50 to-white">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Líquido a Receber</p>
              <p className="text-xs text-gray-400 mt-0.5">Bruto ({formatCurrency(totalBruto)}) — INSS ({formatCurrency(inss)})</p>
            </div>
            <p className="text-3xl font-black text-green-600">{formatCurrency(totalLiquido)}</p>
          </div>

          {/* % Atingimento */}
          <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">% Atingimento de Meta ({formatCurrency(parametros.meta)})</span>
              <span className={`font-bold ${resultado.totalVendas >= parametros.meta ? 'text-green-600' : 'text-blue-600'}`}>
                {formatPercent(resultado.totalVendas / parametros.meta)}
                {resultado.totalVendas >= parametros.meta ? ' 🎉' : ''}
              </span>
            </div>
            <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((resultado.totalVendas / parametros.meta) * 100, 100)}%`,
                  background: resultado.totalVendas >= parametros.meta ? '#16a34a' : '#2563eb',
                }}
              />
            </div>
          </div>

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-8 px-5 py-6 border-t border-gray-200">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2">
                <p className="text-xs text-gray-600 font-medium">Assinatura do Funcionário</p>
                <p className="text-xs text-gray-400 mt-0.5">{nomeVendedor.toUpperCase()}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2">
                <p className="text-xs text-gray-600 font-medium">Assinatura do Empregador</p>
                <p className="text-xs text-gray-400 mt-0.5">DATA: ___/___/______</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-2 border-t border-gray-100 bg-gray-50 text-center">
            <p className="text-xs text-gray-400">
              Documento gerado pelo ComissãoSys — {MESES[mes-1]}/{ano} — Confidencial
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3 border-r last:border-r-0 border-b border-gray-100">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function RubricaRow({ desc, valor, tipo, dim }: {
  desc: string; valor: string; tipo: 'provento' | 'desconto'; dim?: boolean
}) {
  return (
    <div className={`flex justify-between items-start px-5 py-2.5 ${dim ? 'opacity-40' : ''}`}>
      <span className="text-sm text-gray-700 flex-1 pr-4">{desc}</span>
      <span className={`text-sm font-bold whitespace-nowrap ${tipo === 'provento' ? 'text-green-700' : 'text-red-600'}`}>
        {tipo === 'desconto' ? '- ' : ''}{valor}
      </span>
    </div>
  )
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="px-5 py-2 text-xs font-bold uppercase tracking-wider border-y" style={{ background: `${color}15`, color, borderColor: `${color}30` }}>
      {children}
    </div>
  )
}
