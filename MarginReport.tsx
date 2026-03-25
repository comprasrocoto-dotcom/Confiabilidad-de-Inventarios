import React, { useMemo, useState } from 'react';
import { ArticleSummary } from './types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, ReferenceLine
} from 'recharts';
import { Info, TrendingDown, AlertTriangle, CheckCircle2, Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface MarginReportProps {
  data: ArticleSummary[];
}

const NAV = '#0F2044';
const GOLD = '#C4973A';
const RED = '#8B1A1A';
const GREEN = '#1A7A4A';
const AMBER = '#B87333';
const BLUE = '#1B4F8A';

const fmt = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const fmtNum = (v: number, dec = 2) => v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: dec });

const Pill = ({ color, bg, border, children }: any) => (
  <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const }}>
    {children}
  </span>
);

export const MarginReport: React.FC<MarginReportProps> = ({ data }) => {
  const [expandedSede, setExpandedSede] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'todos' | 'cobrable' | 'exento' | 'porcentaje'>('todos');
  const [sortBy, setSortBy] = useState<'diferencia' | 'margen' | 'ahorro'>('ahorro');

  const formatCurrency = fmt;

  // Compute per-article margin impact
  const articles = useMemo(() => {
    return data.map(a => {
      const absDiff = Math.abs(a.totalDiferencia);
      // What would have been cobrado WITHOUT margin (old: fijo 3 oz / 1 unit)
      const oldMargen = a.subarticulo.includes('ONZA') || a.subarticulo.includes('COPA') ? 3
        : a.subarticulo.includes('GRAMO') ? 1000 : 1;
      const cobrableOld = a.tipo === 'FALTANTE' && absDiff > oldMargen;
      const cobroOld = cobrableOld ? absDiff * (a.ultimoCoste || a.costePromedio) : 0;

      // Saving = what was forgiven thanks to the 2.5% margin
      const ahorroPorMargen = a.debeCobrar ? 0 : (cobrableOld && !a.debeCobrar)
        ? absDiff * (a.ultimoCoste || a.costePromedio)
        : 0;

      return {
        ...a,
        absDiff,
        cobrableOld,
        cobroOld,
        ahorroPorMargen,
        margenUnidades: a.margenAplicado,
        excedente: absDiff > a.margenAplicado ? absDiff - a.margenAplicado : 0,
        pctDiferencia: a.stockFecha > 0 ? (absDiff / a.stockFecha) * 100 : 0
      };
    });
  }, [data]);

  // Aggregates by sede
  const bySede = useMemo(() => {
    const map = new Map<string, typeof articles>();
    articles.forEach(a => {
      if (!map.has(a.sede)) map.set(a.sede, []);
      map.get(a.sede)!.push(a);
    });
    return Array.from(map.entries()).map(([sede, arts]) => {
      const conMargen = arts.filter(a => a.margenTipo === 'PORCENTAJE');
      const exentos = arts.filter(a => a.margenTipo === 'EXENTO');
      const cobrablesNuevos = arts.filter(a => a.debeCobrar);
      const cobrablesViejos = arts.filter(a => a.cobrableOld);
      const totalAhorro = arts.reduce((acc, a) => acc + a.ahorroPorMargen, 0);
      const totalCobroNuevo = arts.reduce((acc, a) => acc + a.totalCobro, 0);
      const totalCobroViejo = arts.reduce((acc, a) => acc + a.cobroOld, 0);
      const totalMargenOtorgado = arts.reduce((acc, a) => acc + (a.margenTipo === 'PORCENTAJE' ? a.margenAplicado : 0), 0);
      return {
        sede, arts, conMargen, exentos,
        cobrablesNuevos: cobrablesNuevos.length,
        cobrablesViejos: cobrablesViejos.length,
        totalAhorro, totalCobroNuevo, totalCobroViejo,
        totalMargenOtorgado,
        diferenciaEnCobro: totalCobroNuevo - totalCobroViejo
      };
    }).sort((a, b) => b.totalAhorro - a.totalAhorro);
  }, [articles]);

  // Global stats
  const globalStats = useMemo(() => {
    const totalCobroNuevo = bySede.reduce((a, s) => a + s.totalCobroNuevo, 0);
    const totalCobroViejo = bySede.reduce((a, s) => a + s.totalCobroViejo, 0);
    const totalAhorro = bySede.reduce((a, s) => a + s.totalAhorro, 0);
    const articulosConMargen = articles.filter(a => a.margenTipo === 'PORCENTAJE').length;
    const articulosExentos = articles.filter(a => a.margenTipo === 'EXENTO').length;
    const articulosPerdonados = articles.filter(a => !a.debeCobrar && a.cobrableOld).length;
    return { totalCobroNuevo, totalCobroViejo, totalAhorro, articulosConMargen, articulosExentos, articulosPerdonados };
  }, [bySede, articles]);

  // Chart data
  const chartData = useMemo(() => bySede.map(s => ({
    name: s.sede.length > 14 ? s.sede.substring(0, 14) + '…' : s.sede,
    'Cobro Nuevo (2.5%)': Math.round(s.totalCobroNuevo),
    'Cobro Anterior': Math.round(s.totalCobroViejo),
    'Margen Otorgado ($)': Math.round(s.totalAhorro)
  })), [bySede]);

  // Filtered article list for detail
  const filteredArticles = useMemo(() => {
    let list = [...articles].filter(a => {
      if (filterMode === 'cobrable') return a.debeCobrar;
      if (filterMode === 'exento') return a.margenTipo === 'EXENTO';
      if (filterMode === 'porcentaje') return a.margenTipo === 'PORCENTAJE' && a.tipo === 'FALTANTE';
      return a.tipo === 'FALTANTE';
    });
    if (sortBy === 'diferencia') list.sort((a, b) => b.absDiff - a.absDiff);
    else if (sortBy === 'margen') list.sort((a, b) => b.margenAplicado - a.margenAplicado);
    else list.sort((a, b) => b.ahorroPorMargen - a.ahorroPorMargen);
    return list;
  }, [articles, filterMode, sortBy]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: NAV, border: `1px solid ${GOLD}`, borderRadius: 6, padding: '10px 16px' }}>
        <p style={{ color: GOLD, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
            {p.name}: <span style={{ color: p.color }}>{fmt(p.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: NAV }}>Informe de Márgenes de Error Aplicados</h2>
        <p className="text-sm mt-1" style={{ color: '#4A5568' }}>
          Comparativo del impacto del margen del <strong>2.5% sobre stock a fecha</strong> vs. criterio anterior
        </p>
      </div>

      {/* Explanation banner */}
      <div style={{ background: '#EEF4FF', border: `1px solid ${BLUE}30`, borderLeft: `4px solid ${BLUE}`, borderRadius: 6, padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: BLUE }} />
        <div style={{ fontSize: 13, color: NAV, lineHeight: 1.6 }}>
          <strong>Regla aplicada:</strong> Para artículos en <strong>ONZA</strong> y <strong>GRAMOS</strong>, el margen de tolerancia es el <strong>2.5% del stock a fecha</strong>. Si la diferencia no supera ese umbral, no se cobra.
          <br />
          Artículos en <strong>UNIDAD</strong> y <strong>COPA</strong> están <strong>exentos</strong> del margen porcentual — se mantiene criterio fijo de 1 unidad.
        </div>
      </div>

      {/* Global KPI Strip */}
      <div style={{ background: NAV, borderRadius: 8, padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Cobro con margen 2.5%', value: fmt(globalStats.totalCobroNuevo), color: GOLD, big: true },
          { label: 'Cobro sin margen (anterior)', value: fmt(globalStats.totalCobroViejo), color: '#F87171', big: true },
          { label: 'Valor perdonado por margen', value: fmt(globalStats.totalAhorro), color: '#4ADE80', big: true },
          { label: 'Artículos con margen %', value: globalStats.articulosConMargen.toString(), color: '#93C5FD', big: false },
          { label: 'Artículos exentos (Unid/Copa)', value: globalStats.articulosExentos.toString(), color: '#FCD34D', big: false },
          { label: 'Perdonados por margen', value: globalStats.articulosPerdonados.toString(), color: '#6EE7B7', big: false },
        ].map((k, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{k.label}</p>
            <p style={{ fontSize: k.big ? 18 : 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Comparison Chart */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #C8D4E0', padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
          Cobro Nuevo vs Anterior por Sede
        </p>
        <p style={{ fontSize: 12, color: '#7A8899', marginBottom: 20 }}>Impacto del margen 2.5% — barras comparativas</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EFF8" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: NAV, fontWeight: 600 }} axisLine={{ stroke: '#C8D4E0' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#7A8899' }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingBottom: 8 }} />
            <Bar dataKey="Cobro Anterior" fill="#F87171" radius={[3, 3, 0, 0]} barSize={22} />
            <Bar dataKey="Cobro Nuevo (2.5%)" fill={GOLD} radius={[3, 3, 0, 0]} barSize={22} />
            <Bar dataKey="Margen Otorgado ($)" fill={GREEN} radius={[3, 3, 0, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-Sede Expandable Cards */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #C8D4E0', overflow: 'hidden' }}>
        <div style={{ background: NAV, padding: '14px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Resumen por Sede — Impacto del Margen
          </p>
        </div>
        {bySede.map(s => (
          <div key={s.sede} style={{ borderBottom: '1px solid #E8EFF8' }}>
            {/* Sede header row */}
            <div
              onClick={() => setExpandedSede(expandedSede === s.sede ? null : s.sede)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 12, padding: '14px 20px', cursor: 'pointer', alignItems: 'center', background: expandedSede === s.sede ? '#F5F8FC' : '#fff' }}
            >
              <span style={{ fontWeight: 700, color: NAV, fontSize: 13 }}>{s.sede}</span>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: '#7A8899', fontWeight: 700, textTransform: 'uppercase' }}>Cobro 2.5%</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: GOLD }}>{fmt(s.totalCobroNuevo)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: '#7A8899', fontWeight: 700, textTransform: 'uppercase' }}>Cobro Anterior</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#F87171' }}>{fmt(s.totalCobroViejo)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: '#7A8899', fontWeight: 700, textTransform: 'uppercase' }}>Perdonado</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: GREEN }}>{fmt(s.totalAhorro)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: '#7A8899', fontWeight: 700, textTransform: 'uppercase' }}>Cobrables</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: RED }}>{s.cobrablesNuevos}</p>
              </div>
              {expandedSede === s.sede
                ? <ChevronUp className="w-4 h-4" style={{ color: '#7A8899' }} />
                : <ChevronDown className="w-4 h-4" style={{ color: '#7A8899' }} />}
            </div>

            {/* Expanded detail */}
            {expandedSede === s.sede && (
              <div style={{ padding: '0 20px 16px', borderTop: '1px solid #E8EFF8' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 }}>
                    <thead>
                      <tr style={{ background: '#F0F3F7' }}>
                        {['Artículo', 'CC', 'Unidad', 'Stock a Fecha', 'Margen Tipo', 'Margen (unid)', '% Diferencia', 'Diferencia', 'Cobro 2.5%', 'Cobro Anterior', 'Estado'].map((h, i) => (
                          <th key={i} style={{ padding: '8px 12px', textAlign: i > 2 ? 'center' : 'left', fontSize: 9, fontWeight: 700, color: NAV, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #C8D4E0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.arts.filter(a => a.tipo === 'FALTANTE').sort((a, b) => b.totalCobro - a.totalCobro).map((a, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F5F8FC', borderBottom: '1px solid #E8EFF8' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: NAV, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.articulo}>{a.articulo}</td>
                          <td style={{ padding: '8px 12px', color: '#4A5568', fontSize: 11 }}>{a.cc}</td>
                          <td style={{ padding: '8px 12px', color: '#4A5568', fontSize: 11 }}>{a.subarticulo}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#4A5568' }}>{fmtNum(a.stockFecha, 1)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {a.margenTipo === 'PORCENTAJE'
                              ? <Pill color={BLUE} bg="#EEF4FF" border={`${BLUE}30`}>2.5%</Pill>
                              : <Pill color={AMBER} bg="#FFF8EE" border={`${AMBER}30`}>Fijo</Pill>}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: BLUE }}>{fmtNum(a.margenAplicado, 2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: a.pctDiferencia > 2.5 ? RED : GREEN, fontWeight: 700 }}>{fmtNum(a.pctDiferencia, 2)}%</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: RED, fontWeight: 700 }}>{fmtNum(a.absDiff, 2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: a.debeCobrar ? RED : '#4A5568' }}>{fmt(a.totalCobro)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#9CA3AF', textDecoration: a.debeCobrar !== a.cobrableOld ? 'line-through' : 'none' }}>{fmt(a.cobroOld)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {a.debeCobrar
                              ? <Pill color={RED} bg="#FEF2F2" border={`${RED}20`}>Cobra</Pill>
                              : a.cobrableOld
                              ? <Pill color={GREEN} bg="#F0FFF4" border={`${GREEN}20`}>Perdonado</Pill>
                              : <Pill color="#7A8899" bg="#F5F8FC" border="#C8D4E0">OK</Pill>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <tfoot>
                    <tr style={{background:'#0F2044'}}>
                      <td colSpan={4} style={{padding:'8px 12px',color:'#C4973A',fontWeight:700,fontSize:11,textTransform:'uppercase'}}>
                        Faltantes: {s.arts.filter(a=>a.tipo==='FALTANTE').length} | Cobrables: {s.arts.filter(a=>a.debeCobrar).length}
                      </td>
                      <td style={{padding:'8px 12px',textAlign:'right',fontWeight:800,color:'white',fontSize:13}}>
                        {fmt(s.arts.reduce((acc,a)=>acc+a.totalCobro,0))}
                      </td>
                    </tr>
                  </tfoot>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full detail table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #C8D4E0', overflow: 'hidden' }}>
        <div style={{ background: NAV, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Detalle de Todos los Faltantes — Análisis de Margen
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'cobrable', label: 'Cobrables' },
              { key: 'porcentaje', label: 'Con margen %' },
              { key: 'exento', label: 'Exentos' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilterMode(f.key as any)} style={{
                background: filterMode === f.key ? GOLD : 'transparent',
                color: filterMode === f.key ? NAV : 'rgba(255,255,255,0.7)',
                border: `1px solid ${filterMode === f.key ? GOLD : 'rgba(255,255,255,0.2)'}`,
                borderRadius: 4, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 20px', background: '#F5F8FC', borderBottom: '1px solid #E8EFF8', display: 'flex', gap: 12, alignItems: 'center' }}>
          <Filter className="w-3 h-3" style={{ color: '#7A8899' }} />
          <span style={{ fontSize: 11, color: '#7A8899', fontWeight: 700, textTransform: 'uppercase' }}>Ordenar por:</span>
          {[
            { key: 'ahorro', label: 'Valor Perdonado' },
            { key: 'diferencia', label: 'Diferencia' },
            { key: 'margen', label: 'Margen' },
          ].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key as any)} style={{
              background: sortBy === s.key ? NAV : 'transparent',
              color: sortBy === s.key ? '#fff' : NAV,
              border: `1px solid ${NAV}`, borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
            }}>{s.label}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#7A8899' }}>{filteredArticles.length} artículos</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F0F3F7' }}>
                {['Artículo', 'Unidad', 'Stock Fecha', 'Stock Inv.', 'Margen', 'Diferencia', '% Dif/Stock', 'Excedente', 'Precio Unit.', 'Cobro 2.5%', 'Cobro Anterior', 'Acción'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 12px', textAlign: i > 3 ? 'center' : 'left', fontSize: 9, fontWeight: 700, color: NAV, textTransform: 'uppercase', borderBottom: '2px solid #C8D4E0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredArticles.slice(0, 150).map((a, i) => {
                const deltaCobro = a.totalCobro - a.cobroOld;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F5F8FC', borderBottom: '1px solid #E8EFF8' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: NAV, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${a.sede} · ${a.cc} — ${a.articulo}`}>{a.articulo}</td>
                    <td style={{ padding: '8px 12px', color: '#4A5568', fontSize: 11 }}>{a.subarticulo}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{fmtNum(a.stockFecha, 1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#4A5568' }}>{fmtNum((a as any).stockInventario ?? 0, 1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: BLUE, fontWeight: 700 }}>
                      {a.margenTipo === 'PORCENTAJE' ? `${fmtNum(a.margenAplicado, 2)} (2.5%)` : a.margenTipo === 'FIJO' ? `±${fmtNum(a.margenAplicado, 0)} oz` : `±1`}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: RED, fontWeight: 700 }}>{fmtNum(a.absDiff, 2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: a.pctDiferencia > 2.5 ? RED : GREEN, fontWeight: 700 }}>{fmtNum(a.pctDiferencia, 2)}%</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: a.excedente > 0 ? RED : '#9CA3AF', fontWeight: a.excedente > 0 ? 700 : 400 }}>
                      {a.excedente > 0 ? fmtNum(a.excedente, 2) : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: BLUE }}>{fmt(a.ultimoCoste || a.costePromedio)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: a.debeCobrar ? RED : '#9CA3AF' }}>{a.totalCobro > 0 ? fmt(a.totalCobro) : '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: 11, textDecoration: a.debeCobrar !== a.cobrableOld ? 'line-through' : 'none' }}>{a.cobroOld > 0 ? fmt(a.cobroOld) : '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {a.debeCobrar
                        ? <Pill color={RED} bg="#FEF2F2" border={`${RED}20`}>Cobra</Pill>
                        : a.cobrableOld
                        ? <Pill color={GREEN} bg="#F0FFF4" border={`${GREEN}20`}>Perdonado</Pill>
                        : <Pill color="#7A8899" bg="#F5F8FC" border="#C8D4E0">Dentro margen</Pill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredArticles.length > 150 && (
            <p style={{ textAlign: 'center', padding: '12px', fontSize: 11, color: '#7A8899' }}>
              Mostrando 150 de {filteredArticles.length} artículos. Filtra por sede o estado para ver más.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
