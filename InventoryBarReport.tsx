import React, { useMemo, useState } from 'react';
import { ArticleSummary } from './types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LabelList,
  ReferenceLine
} from 'recharts';
import { BarChart3, TrendingDown, TrendingUp, AlertTriangle, DollarSign, Filter } from 'lucide-react';

interface InventoryBarReportProps {
  data: ArticleSummary[];
}

type MetricType = 'confiabilidad' | 'faltantes' | 'sobrantes' | 'impacto' | 'cobrables';

const COLORS = {
  navy: '#0F2044',
  blue: '#1B4F8A',
  gold: '#C4973A',
  success: '#1A7A4A',
  danger: '#8B1A1A',
  warning: '#B87333',
  neutral: '#4A5568',
  lightBlue: '#4A80B5',
};

const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (active && payload && payload.length) {
    const formatVal = (v: number, m: MetricType) => {
      if (m === 'impacto') return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
      if (m === 'confiabilidad') return `${v.toFixed(1)}%`;
      return v.toString();
    };

    return (
      <div style={{
        background: '#0F2044', border: '1px solid #C4973A', borderRadius: 6,
        padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <p style={{ color: '#C4973A', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
            {p.name}: <span style={{ color: p.color || '#C4973A' }}>{formatVal(p.value, metric)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const InventoryBarReport: React.FC<InventoryBarReportProps> = ({ data }) => {
  const [activeMetric, setActiveMetric] = useState<MetricType>('confiabilidad');
  const [chartType, setChartType] = useState<'single' | 'comparative'>('comparative');

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  // Build per-sede stats
  const sedeStats = useMemo(() => {
    const map = new Map<string, ArticleSummary[]>();
    data.forEach(a => {
      if (!map.has(a.sede)) map.set(a.sede, []);
      map.get(a.sede)!.push(a);
    });

    return Array.from(map.entries()).map(([sede, arts]) => {
      const total = arts.length;
      const sinDif = arts.filter(a => Math.abs(a.totalDiferencia) < 0.0001).length;
      const faltantes = arts.filter(a => a.tipo === 'FALTANTE').length;
      const sobrantes = arts.filter(a => a.tipo === 'SOBRANTE').length;
      const cobrables = arts.filter(a => a.debeCobrar).length;
      const impacto = arts.reduce((acc, a) => acc + a.totalCobro, 0);
      const confiabilidad = total > 0 ? (sinDif / total) * 100 : 0;

      const nivel = confiabilidad >= 85 ? 'Confiable' : confiabilidad >= 70 ? 'Alerta' : 'Crítico';

      return { sede, total, sinDif, faltantes, sobrantes, cobrables, impacto, confiabilidad, nivel };
    }).sort((a, b) => b.confiabilidad - a.confiabilidad);
  }, [data]);

  // Comparative chart: faltantes vs sobrantes side by side
  const comparativeData = useMemo(() => {
    return sedeStats.map(s => ({
      name: s.sede.length > 18 ? s.sede.substring(0, 18) + '…' : s.sede,
      fullName: s.sede,
      faltantes: s.faltantes,
      sobrantes: s.sobrantes,
      cobrables: s.cobrables,
      confiabilidad: Math.round(s.confiabilidad * 10) / 10,
      impacto: s.impacto,
      nivel: s.nivel
    }));
  }, [sedeStats]);

  const getBarColor = (nivel: string) => {
    if (nivel === 'Confiable') return COLORS.success;
    if (nivel === 'Alerta') return COLORS.warning;
    return COLORS.danger;
  };

  const metrics: { key: MetricType; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'confiabilidad', label: 'Confiabilidad (%)', icon: <AlertTriangle className="w-3 h-3" />, color: COLORS.blue },
    { key: 'faltantes', label: 'Faltantes', icon: <TrendingDown className="w-3 h-3" />, color: COLORS.danger },
    { key: 'sobrantes', label: 'Sobrantes', icon: <TrendingUp className="w-3 h-3" />, color: COLORS.success },
    { key: 'cobrables', label: 'Cobrables', icon: <DollarSign className="w-3 h-3" />, color: COLORS.warning },
    { key: 'impacto', label: 'Impacto ($)', icon: <BarChart3 className="w-3 h-3" />, color: COLORS.gold },
  ];

  // Summary KPIs across all sedes
  const totalFaltantes = sedeStats.reduce((a, s) => a + s.faltantes, 0);
  const totalSobrantes = sedeStats.reduce((a, s) => a + s.sobrantes, 0);
  const totalCobrables = sedeStats.reduce((a, s) => a + s.cobrables, 0);
  const totalImpacto = sedeStats.reduce((a, s) => a + s.impacto, 0);
  const avgConfiabilidad = sedeStats.length > 0 ? sedeStats.reduce((a, s) => a + s.confiabilidad, 0) / sedeStats.length : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#0F2044' }}>Informe Comparativo por Inventario</h2>
          <p className="text-sm" style={{ color: '#4A5568' }}>Análisis visual comparativo del comportamiento de cada sede</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('comparative')}
            style={{
              background: chartType === 'comparative' ? '#0F2044' : 'transparent',
              color: chartType === 'comparative' ? '#fff' : '#0F2044',
              border: '1px solid #0F2044',
              borderRadius: 4, padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Comparativo
          </button>
          <button
            onClick={() => setChartType('single')}
            style={{
              background: chartType === 'single' ? '#0F2044' : 'transparent',
              color: chartType === 'single' ? '#fff' : '#0F2044',
              border: '1px solid #0F2044',
              borderRadius: 4, padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Por Métrica
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div style={{
        background: '#0F2044', borderRadius: 8, padding: '20px 24px',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16
      }}>
        {[
          { label: 'Sedes', value: sedeStats.length.toString(), color: '#C4973A' },
          { label: 'Confiabilidad Prom.', value: `${avgConfiabilidad.toFixed(1)}%`, color: avgConfiabilidad >= 85 ? '#4ADE80' : avgConfiabilidad >= 70 ? '#FCD34D' : '#F87171' },
          { label: 'Total Faltantes', value: totalFaltantes.toString(), color: '#F87171' },
          { label: 'Total Sobrantes', value: totalSobrantes.toString(), color: '#4ADE80' },
          { label: 'Impacto Total', value: formatCurrency(totalImpacto), color: '#C4973A' },
        ].map((kpi, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>{kpi.label}</p>
            <p style={{ fontSize: i === 4 ? 14 : 20, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {chartType === 'comparative' ? (
        /* === COMPARATIVE CHART: Faltantes vs Sobrantes === */
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #C8D4E0', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              📊 Faltantes vs Sobrantes por Sede
            </p>
            <p style={{ fontSize: 12, color: '#7A8899' }}>Comparación directa de artículos con diferencia positiva y negativa</p>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={comparativeData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EFF8" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                tick={{ fontSize: 11, fill: '#0F2044', fontWeight: 600 }}
                axisLine={{ stroke: '#C8D4E0' }}
                tickLine={false}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#7A8899' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip metric="faltantes" />} />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 8, fontSize: 12, fontWeight: 700 }}
              />
              <Bar dataKey="faltantes" name="Faltantes" fill={COLORS.danger} radius={[3, 3, 0, 0]} barSize={18}>
                <LabelList dataKey="faltantes" position="top" style={{ fontSize: 10, fill: COLORS.danger, fontWeight: 700 }} />
              </Bar>
              <Bar dataKey="sobrantes" name="Sobrantes" fill={COLORS.success} radius={[3, 3, 0, 0]} barSize={18}>
                <LabelList dataKey="sobrantes" position="top" style={{ fontSize: 10, fill: COLORS.success, fontWeight: 700 }} />
              </Bar>
              <Bar dataKey="cobrables" name="Cobrables" fill={COLORS.gold} radius={[3, 3, 0, 0]} barSize={18}>
                <LabelList dataKey="cobrables" position="top" style={{ fontSize: 10, fill: COLORS.gold, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* === SINGLE METRIC CHART === */
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #C8D4E0', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {/* Metric Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#7A8899', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 8 }}>
              <Filter className="w-3 h-3 inline mr-1" />Métrica:
            </span>
            {metrics.map(m => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                style={{
                  background: activeMetric === m.key ? m.color : 'transparent',
                  color: activeMetric === m.key ? '#fff' : m.color,
                  border: `1px solid ${m.color}`,
                  borderRadius: 4, padding: '4px 12px', fontSize: 11,
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={comparativeData} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EFF8" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                tick={{ fontSize: 11, fill: '#0F2044', fontWeight: 600 }}
                axisLine={{ stroke: '#C8D4E0' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#7A8899' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={activeMetric === 'impacto' ? (v) => `$${(v / 1000).toFixed(0)}K` : undefined}
              />
              {activeMetric === 'confiabilidad' && (
                <>
                  <ReferenceLine y={85} stroke={COLORS.success} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '85% Confiable', fill: COLORS.success, fontSize: 10, fontWeight: 700 }} />
                  <ReferenceLine y={70} stroke={COLORS.warning} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '70% Alerta', fill: COLORS.warning, fontSize: 10, fontWeight: 700 }} />
                </>
              )}
              <Tooltip content={<CustomTooltip metric={activeMetric} />} />
              <Bar dataKey={activeMetric} radius={[4, 4, 0, 0]} barSize={28}>
                {comparativeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      activeMetric === 'confiabilidad'
                        ? getBarColor(entry.nivel)
                        : activeMetric === 'faltantes' || activeMetric === 'cobrables'
                        ? COLORS.danger
                        : activeMetric === 'sobrantes'
                        ? COLORS.success
                        : COLORS.gold
                    }
                  />
                ))}
                <LabelList
                  dataKey={activeMetric}
                  position="top"
                  formatter={(v: number) => activeMetric === 'confiabilidad' ? `${v}%` : activeMetric === 'impacto' ? `$${(v / 1000).toFixed(0)}K` : v}
                  style={{ fontSize: 10, fontWeight: 700, fill: '#0F2044' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Second comparative chart: Confiabilidad ranking */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #C8D4E0', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
            🏅 Ranking de Confiabilidad por Sede
          </p>
          <p style={{ fontSize: 12, color: '#7A8899' }}>Semáforo visual: Verde ≥85% · Ámbar 70-84% · Rojo &lt;70%</p>
        </div>
        <ResponsiveContainer width="100%" height={comparativeData.length * 48 + 20}>
          <BarChart data={comparativeData} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EFF8" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#7A8899' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <YAxis
              dataKey="name"
              type="category"
              width={130}
              tick={{ fontSize: 11, fill: '#0F2044', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={85} stroke={COLORS.success} strokeDasharray="4 2" strokeWidth={1.5} />
            <ReferenceLine x={70} stroke={COLORS.warning} strokeDasharray="4 2" strokeWidth={1.5} />
            <Tooltip content={<CustomTooltip metric="confiabilidad" />} />
            <Bar dataKey="confiabilidad" radius={[0, 4, 4, 0]} barSize={22}>
              {comparativeData.map((entry, i) => (
                <Cell key={`h-cell-${i}`} fill={getBarColor(entry.nivel)} />
              ))}
              <LabelList
                dataKey="confiabilidad"
                position="right"
                formatter={(v: number) => `${v.toFixed(1)}%`}
                style={{ fontSize: 11, fontWeight: 700, fill: '#0F2044' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { color: COLORS.success, label: 'Confiable (≥85%)' },
            { color: COLORS.warning, label: 'Alerta (70–84%)' },
            { color: COLORS.danger, label: 'Crítico (<70%)' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: l.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#4A5568' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #C8D4E0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ background: '#0F2044', padding: '14px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#C4973A', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Detalle Numérico por Sede
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F0F3F7' }}>
                {['#', 'Sede', 'Artículos', 'Confiabilidad', 'Faltantes', 'Sobrantes', 'Cobrables', 'Impacto $', 'Estado'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: i > 1 ? 'center' : 'left', fontSize: 10, fontWeight: 700, color: '#0F2044', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '2px solid #C8D4E0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sedeStats.map((s, i) => {
                const nivel = s.nivel;
                const nivelColor = nivel === 'Confiable' ? COLORS.success : nivel === 'Alerta' ? COLORS.warning : COLORS.danger;
                return (
                  <tr key={s.sede} style={{ background: i % 2 === 0 ? '#fff' : '#F5F8FC', borderBottom: '1px solid #E8EFF8' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7A8899', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F2044' }}>{s.sede}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#4A5568' }}>{s.total}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: nivelColor }}>{s.confiabilidad.toFixed(1)}%</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: COLORS.danger }}>{s.faltantes}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: COLORS.success }}>{s.sobrantes}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: COLORS.gold }}>{s.cobrables}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: COLORS.danger }}>{formatCurrency(s.impacto)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        background: `${nivelColor}15`, color: nivelColor,
                        border: `1px solid ${nivelColor}40`,
                        borderRadius: 4, padding: '2px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase'
                      }}>
                        {nivel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
