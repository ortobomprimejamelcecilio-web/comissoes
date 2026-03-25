'use client'

export default function DashboardError({ error }: { error: Error }) {
  return (
    <div className="p-8 bg-red-50 rounded-2xl border border-red-200">
      <h2 className="text-red-700 font-bold text-lg mb-2">Erro no Dashboard</h2>
      <pre className="text-red-600 text-sm whitespace-pre-wrap">{error.message}</pre>
      <pre className="text-red-400 text-xs mt-2 whitespace-pre-wrap">{error.stack}</pre>
    </div>
  )
}
