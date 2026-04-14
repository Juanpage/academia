'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { reportsApi } from '../../lib/api';

const TABS = [
  { key: 'ranking',      label: 'Ranking General',    icon: '🏆' },
  { key: 'evaluaciones', label: 'Evaluaciones',        icon: '📋' },
  { key: 'pagos',        label: 'Estado Financiero',   icon: '💰' },
];

function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const [tab,          setTab]          = useState('ranking');
  const [ranking,      setRanking]      = useState([]);
  const [evaluations,  setEvaluations]  = useState({});
  const [payments,     setPayments]     = useState({ payments: [], summary: {} });
  const [loading,      setLoading]      = useState(false);
  const [exporting,    setExporting]    = useState('');
  const [evalTab,      setEvalTab]      = useState('academic');
  const [search,       setSearch]       = useState('');

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === 'ranking') {
        const r = await reportsApi.ranking();
        setRanking(r.data.ranking || []);
      } else if (tab === 'evaluaciones') {
        const r = await reportsApi.evaluations();
        setEvaluations(r.data);
      } else if (tab === 'pagos') {
        const r = await reportsApi.payments();
        setPayments(r.data);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function exportExcel(type) {
    setExporting(type);
    try {
      const res = type === 'ranking'
        ? await reportsApi.exportRankingXlsx()
        : await reportsApi.exportPaymentsXlsx();
      downloadBlob(res.data, type === 'ranking' ? 'ranking_aspirantes.xlsx' : 'reporte_pagos.xlsx');
    } catch(e) { alert('Error exportando'); }
    finally { setExporting(''); }
  }

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.setTextColor(26, 46, 26);
    doc.text('Academia Militar Digital', 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text('Ranking General de Aspirantes — ' + new Date().toLocaleDateString('es-EC'), 14, 22);

    const filtered = ranking.filter(r =>
      !search || (r.first_name + ' ' + r.last_name + r.cedula).toLowerCase().includes(search.toLowerCase())
    );

    autoTable(doc, {
      startY: 28,
      head: [['#', 'Cedula', 'Aspirante', 'Academico', 'Fisico', 'Psicologico', 'Medico', 'Total', 'Estado']],
      body: filtered.map((r, i) => [
        i + 1,
        r.cedula,
        r.first_name + ' ' + r.last_name,
        parseFloat(r.academic_score).toFixed(2),
        parseFloat(r.physical_score).toFixed(2),
        parseFloat(r.psych_score).toFixed(2),
        parseFloat(r.medical_score).toFixed(2),
        parseFloat(r.total_score).toFixed(2),
        r.status,
      ]),
      headStyles: { fillColor: [26, 46, 26], textColor: [201, 162, 39], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [242, 242, 242] },
      styles: { fontSize: 9 },
    });

    doc.save('ranking_aspirantes.pdf');
  }

  const filteredRanking = ranking.filter(r =>
    !search || (r.first_name + ' ' + r.last_name + r.cedula).toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s) => s === 'paid' ? 'text-green-400' : s === 'overdue' ? 'text-red-400' : 'text-yellow-400';
  const scoreColor  = (v) => parseFloat(v) >= 15 ? 'text-green-400' : parseFloat(v) >= 10 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-military-900 text-military-100">
      {/* Header */}
      <div className="bg-military-800 border-b border-military-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')}
            className="text-military-400 hover:text-military-200 text-sm transition-colors">
            &larr; Dashboard
          </button>
          <span className="text-military-600">/</span>
          <h1 className="text-gold-400 font-display font-bold tracking-widest">REPORTES</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ' +
                (tab === t.key ? 'bg-gold-500 text-military-900 font-bold' : 'bg-military-800 text-military-400 hover:text-military-200 border border-military-700')}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-military-400 text-center py-12">Cargando...</p>}

        {/* ── RANKING ── */}
        {!loading && tab === 'ranking' && (
          <div className="space-y-4">
            {/* Controles */}
            <div className="flex gap-3 items-center flex-wrap">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o cedula..."
                className="flex-1 min-w-48 bg-military-800 border border-military-700 rounded-lg px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
              <button onClick={exportPDF}
                className="bg-red-700 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                📄 Exportar PDF
              </button>
              <button onClick={() => exportExcel('ranking')} disabled={exporting === 'ranking'}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                {exporting === 'ranking' ? 'Exportando...' : '📊 Exportar Excel'}
              </button>
            </div>

            {/* Tabla */}
            <div className="bg-military-800 border border-military-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-military-700 border-b border-military-600">
                      <th className="px-3 py-3 text-left text-military-300 text-xs uppercase tracking-wider w-10">#</th>
                      <th className="px-3 py-3 text-left text-military-300 text-xs uppercase tracking-wider">Aspirante</th>
                      <th className="px-3 py-3 text-left text-military-300 text-xs uppercase tracking-wider">Cedula</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase tracking-wider">Academico</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase tracking-wider">Fisico</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase tracking-wider">Psicologico</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase tracking-wider">Medico</th>
                      <th className="px-3 py-3 text-center text-gold-400 text-xs uppercase tracking-wider font-bold">Total</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRanking.map((r, i) => (
                      <tr key={r.id} className={'border-b border-military-700 hover:bg-military-700/50 transition-colors ' + (i % 2 === 0 ? '' : 'bg-military-800/50')}>
                        <td className="px-3 py-3 text-gold-400 font-bold">{i + 1}</td>
                        <td className="px-3 py-3">
                          <p className="text-military-100 font-medium">{r.first_name} {r.last_name}</p>
                          <p className="text-military-500 text-xs">{r.email}</p>
                        </td>
                        <td className="px-3 py-3 text-military-300">{r.cedula}</td>
                        <td className={'px-3 py-3 text-center font-semibold ' + scoreColor(r.academic_score)}>{parseFloat(r.academic_score).toFixed(2)}</td>
                        <td className={'px-3 py-3 text-center font-semibold ' + scoreColor(r.physical_score)}>{parseFloat(r.physical_score).toFixed(2)}</td>
                        <td className={'px-3 py-3 text-center font-semibold ' + scoreColor(r.psych_score)}>{parseFloat(r.psych_score).toFixed(2)}</td>
                        <td className={'px-3 py-3 text-center font-semibold ' + scoreColor(r.medical_score)}>{parseFloat(r.medical_score).toFixed(2)}</td>
                        <td className={'px-3 py-3 text-center font-bold text-lg font-display ' + scoreColor(r.total_score)}>{parseFloat(r.total_score).toFixed(2)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={'text-xs px-2 py-0.5 rounded-full ' +
                            (r.status === 'active' ? 'bg-green-900/50 text-green-400' :
                             r.status === 'registered' ? 'bg-blue-900/50 text-blue-400' :
                             'bg-military-700 text-military-400')}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRanking.length === 0 && (
                      <tr><td colSpan={9} className="px-3 py-8 text-center text-military-500">Sin resultados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── EVALUACIONES ── */}
        {!loading && tab === 'evaluaciones' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                { key: 'academic', label: 'Academicas' },
                { key: 'physical', label: 'Fisicas' },
                { key: 'psico',    label: 'Psicologicas' },
                { key: 'medical',  label: 'Medicas' },
              ].map(t => (
                <button key={t.key} onClick={() => setEvalTab(t.key)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' +
                    (evalTab === t.key ? 'bg-gold-500 text-military-900 font-bold' : 'bg-military-800 text-military-400 border border-military-700')}>
                  {t.label} ({(evaluations[t.key] || []).length})
                </button>
              ))}
            </div>

            <div className="bg-military-800 border border-military-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-military-700 border-b border-military-600">
                      <th className="px-3 py-3 text-left text-military-300 text-xs uppercase">Aspirante</th>
                      <th className="px-3 py-3 text-left text-military-300 text-xs uppercase">Cedula</th>
                      {evalTab === 'academic' && <>
                        <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Promedio</th>
                        <th className="px-3 py-3 text-left text-military-300 text-xs uppercase">Periodo</th>
                      </>}
                      {evalTab === 'physical' && <>
                        <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Total /20</th>
                        <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Estado</th>
                      </>}
                      {evalTab === 'psico' && <>
                        <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Total /20</th>
                        <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Resultado</th>
                      </>}
                      {evalTab === 'medical' && <>
                        <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">IMC</th>
                        <th className="px-3 py-3 text-left text-military-300 text-xs uppercase">Institucion</th>
                      </>}
                      <th className="px-3 py-3 text-left text-military-300 text-xs uppercase">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(evaluations[evalTab] || []).map((ev, i) => (
                      <tr key={ev.id} className={'border-b border-military-700 hover:bg-military-700/50 ' + (i%2===0?'':'bg-military-800/50')}>
                        <td className="px-3 py-2 text-military-200">{ev.aspirante}</td>
                        <td className="px-3 py-2 text-military-400 text-xs">{ev.cedula}</td>
                        {evalTab === 'academic' && <>
                          <td className={'px-3 py-2 text-center font-bold ' + scoreColor(ev.promedio_100)}>{parseFloat(ev.promedio_100 || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-military-400 text-xs">{ev.periodo || '—'}</td>
                        </>}
                        {evalTab === 'physical' && <>
                          <td className={'px-3 py-2 text-center font-bold ' + scoreColor(ev.total_score_20)}>{parseFloat(ev.total_score_20 || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={'text-xs font-bold ' + (ev.es_descalificado ? 'text-red-400' : 'text-green-400')}>
                              {ev.es_descalificado ? 'DESCALIFICADO' : 'APROBADO'}
                            </span>
                          </td>
                        </>}
                        {evalTab === 'psico' && <>
                          <td className={'px-3 py-2 text-center font-bold ' + scoreColor(ev.total_score)}>{parseFloat(ev.total_score || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={'text-xs font-bold ' + (ev.resultado === 'APTO' ? 'text-green-400' : 'text-red-400')}>
                              {ev.resultado === 'APTO' ? 'APTO' : 'NO APTO'}
                            </span>
                          </td>
                        </>}
                        {evalTab === 'medical' && <>
                          <td className="px-3 py-2 text-center text-military-300">{ev.imc ? parseFloat(ev.imc).toFixed(2) : '—'}</td>
                          <td className="px-3 py-2 text-military-400 text-xs">{ev.institucion_emisora || '—'}</td>
                        </>}
                        <td className="px-3 py-2 text-military-500 text-xs">{new Date(ev.created_at).toLocaleDateString('es-EC')}</td>
                      </tr>
                    ))}
                    {(evaluations[evalTab] || []).length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-8 text-center text-military-500">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PAGOS ── */}
        {!loading && tab === 'pagos' && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Recaudado', value: '$' + parseFloat(payments.summary?.total_recaudado || 0).toFixed(2), color: 'text-green-400' },
                { label: 'Pendiente',       value: '$' + parseFloat(payments.summary?.total_pendiente || 0).toFixed(2), color: 'text-yellow-400' },
                { label: 'Vencido',         value: '$' + parseFloat(payments.summary?.total_vencido   || 0).toFixed(2), color: 'text-red-400' },
                { label: 'Total Pagos',     value: payments.summary?.total_pagos || 0,                                  color: 'text-military-200' },
              ].map(s => (
                <div key={s.label} className="bg-military-800 border border-military-700 rounded-lg p-4 text-center">
                  <p className="text-military-400 text-xs uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={'text-2xl font-bold font-display ' + s.color}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Export */}
            <div className="flex justify-end">
              <button onClick={() => exportExcel('payments')} disabled={exporting === 'payments'}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                {exporting === 'payments' ? 'Exportando...' : '📊 Exportar Excel'}
              </button>
            </div>

            {/* Tabla */}
            <div className="bg-military-800 border border-military-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-military-700 border-b border-military-600">
                      <th className="px-3 py-3 text-left text-military-300 text-xs uppercase">Aspirante</th>
                      <th className="px-3 py-3 text-left text-military-300 text-xs uppercase">Concepto</th>
                      <th className="px-3 py-3 text-right text-military-300 text-xs uppercase">Monto</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Estado</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Tipo</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Vencimiento</th>
                      <th className="px-3 py-3 text-center text-military-300 text-xs uppercase">Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments.payments || []).map((p, i) => (
                      <tr key={p.id} className={'border-b border-military-700 hover:bg-military-700/50 ' + (i%2===0?'':'bg-military-800/50')}>
                        <td className="px-3 py-2">
                          <p className="text-military-200">{p.aspirante}</p>
                          <p className="text-military-500 text-xs">{p.cedula}</p>
                        </td>
                        <td className="px-3 py-2 text-military-300">{p.concepto || p.concept || '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-military-100">${parseFloat(p.amount).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={'text-xs font-bold ' + statusColor(p.status)}>
                            {p.status === 'paid' ? 'PAGADO' : p.status === 'overdue' ? 'VENCIDO' : 'PENDIENTE'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-military-400 text-xs">{p.payment_type}</td>
                        <td className="px-3 py-2 text-center text-military-400 text-xs">{p.due_date ? new Date(p.due_date).toLocaleDateString('es-EC') : '—'}</td>
                        <td className="px-3 py-2 text-center text-military-400 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-EC') : '—'}</td>
                      </tr>
                    ))}
                    {(payments.payments || []).length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-military-500">Sin pagos registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
