'use client';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

// ─── FÍSICO WIDGET ────────────────────────────────────────────────────────────
interface PruebaFisica {
  fecha: string;
  score_fisico: number;
  flexiones?: number;
  abdominales?: number;
  carrera_1000m?: number;
}

export function FisicoWidget({ historial, ultima }: { historial: PruebaFisica[]; ultima: PruebaFisica | null }) {
  const radarData = ultima ? [
    { prueba: 'Flexiones',   valor: Math.min(100, ((ultima.flexiones   || 0) / 65) * 100) },
    { prueba: 'Abdominales', valor: Math.min(100, ((ultima.abdominales || 0) / 75) * 100) },
    { prueba: 'Carrera',     valor: ultima.carrera_1000m ? Math.max(0, ((300 - ultima.carrera_1000m) / 100) * 100) : 0 },
    { prueba: 'Score',       valor: parseFloat(String(ultima.score_fisico)) || 0 },
  ] : [];

  const tendencia = [...historial].reverse().map(h => ({
    fecha: new Date(h.fecha).toLocaleDateString('es-EC', { month: 'short', day: 'numeric' }),
    score: parseFloat(String(h.score_fisico)) || 0,
  }));

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        💪 Rendimiento Físico
        {ultima && (
          <span className={`text-sm font-normal ml-auto ${
            (ultima.score_fisico || 0) >= 80 ? 'text-green-600' :
            (ultima.score_fisico || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            Último: {parseFloat(String(ultima.score_fisico)).toFixed(1)} pts
          </span>
        )}
      </h2>

      {!ultima && (
        <p className="text-gray-400 text-center py-8">Sin evaluaciones físicas aún</p>
      )}

      {ultima && (
        <div className="space-y-4">
          {radarData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="prueba" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Radar dataKey="valor" stroke="#1B4332" fill="#1B4332" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          )}

          {/* Últimas pruebas */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'Flexiones',   val: ultima.flexiones,   unit: 'reps' },
              { label: 'Abdominales', val: ultima.abdominales, unit: 'reps' },
            ].map(({ label, val, unit }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="font-bold text-gray-800">{val ?? '—'} <span className="text-xs text-gray-500">{unit}</span></div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {tendencia.length > 1 && (
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={tendencia}>
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                <Tooltip formatter={(v: any) => [`${v} pts`, 'Score']} />
                <Line type="monotone" dataKey="score" stroke="#1B4332" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ACADÉMICO WIDGET ─────────────────────────────────────────────────────────
interface Curso {
  course_name: string;
  nota: number | null;
}

export function AcademicoWidget({ cursos, promedio }: { cursos: Curso[]; promedio: string | null }) {
  const colorNota = (n: number | null) =>
    n == null ? 'text-gray-400' :
    n >= 80   ? 'text-green-600 font-bold' :
    n >= 70   ? 'text-blue-600 font-bold' :
    n >= 60   ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📚 Rendimiento Académico
        </h2>
        {promedio && (
          <span className={`text-sm font-semibold ${colorNota(parseFloat(promedio))}`}>
            Promedio: {promedio}
          </span>
        )}
      </div>

      {cursos.length === 0 && (
        <p className="text-gray-400 text-center py-8">Sin calificaciones sincronizadas</p>
      )}

      <div className="space-y-3">
        {cursos.map(c => {
          const nota = c.nota != null ? parseFloat(String(c.nota)) : null;
          const pct  = nota != null ? Math.min(100, nota) : 0;
          return (
            <div key={c.course_name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 truncate max-w-[70%]">{c.course_name}</span>
                <span className={colorNota(nota)}>
                  {nota != null ? nota.toFixed(1) : 'Sin nota'}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct >= 80 ? '#16a34a' : pct >= 70 ? '#2563eb' : pct >= 60 ? '#ca8a04' : '#dc2626',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
