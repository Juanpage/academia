'use client';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Pago {
  id: number;
  periodo: string;
  estado: string;
  monto: string;
  fecha_vencimiento: string;
  plan_nombre: string;
  comprobante_numero?: string;
}

interface Props {
  pagos: Pago[];
  deuda: number;
  tieneMora: boolean;
}

const ESTADO_CONFIG: Record<string, { label: string; cls: string; Icon: any }> = {
  PAGADO:   { label: 'Pagado',   cls: 'badge-pagado',    Icon: CheckCircle },
  VENCIDO:  { label: 'Vencido',  cls: 'badge-vencido',   Icon: AlertTriangle },
  PENDIENTE:{ label: 'Pendiente',cls: 'badge-pendiente', Icon: Clock },
};

export default function PagosWidget({ pagos, deuda, tieneMora }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          💳 Estado de Cuenta
        </h2>
        {tieneMora && (
          <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-3 py-1">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-red-700 text-xs font-semibold">
              Mora: ${parseFloat(String(deuda)).toFixed(2)}
            </span>
          </div>
        )}
        {!tieneMora && deuda === 0 && (
          <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-3 py-1">
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-green-700 text-xs font-semibold">Al día</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-500 font-medium">Concepto</th>
              <th className="text-left py-2 text-gray-500 font-medium">Período</th>
              <th className="text-right py-2 text-gray-500 font-medium">Monto</th>
              <th className="text-center py-2 text-gray-500 font-medium">Estado</th>
              <th className="text-left py-2 text-gray-500 font-medium">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No hay registros de pago
                </td>
              </tr>
            )}
            {pagos.map(p => {
              const cfg = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.PENDIENTE;
              const { Icon } = cfg;
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 text-gray-700">{p.plan_nombre}</td>
                  <td className="py-3 text-gray-600">{p.periodo || '—'}</td>
                  <td className="py-3 text-right font-semibold">
                    ${parseFloat(p.monto).toFixed(2)}
                  </td>
                  <td className="py-3 text-center">
                    <span className={cfg.cls}>
                      <Icon size={10} className="inline mr-1" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">
                    {p.fecha_vencimiento
                      ? new Date(p.fecha_vencimiento).toLocaleDateString('es-EC')
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
