// Hook que lee el Excel directamente del repositorio
// Para actualizar la BD: reemplaza "BASE DE DATOS COBROS.xlsx" en GitLab
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { normalizeData } from './inventory';
import { ArticleSummary } from './types';

import excelUrl from './BASE DE DATOS COBROS.xlsx?url';

const EXCEL_NAME = 'BASE DE DATOS COBROS.xlsx';

interface PreloadedResult {
  articles: ArticleSummary[];
  errors: string[];
  fileName: string;
  loading: boolean;
}

export function usePreloadedInventory(): PreloadedResult {
  const [state, setState] = useState<PreloadedResult>({
    articles: [],
    errors: [],
    fileName: EXCEL_NAME,
    loading: true
  });

  useEffect(() => {
    const loadExcel = async () => {
      try {
        const response = await fetch(excelUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        // cellDates:true → fechas vienen como Date objects (evita el bug de año 0026)
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

        const sheetName = workbook.SheetNames.find(n =>
          n.toUpperCase().includes('BASE') || n.toUpperCase().includes('DATO')
        ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];

        // raw:true para obtener Date objects en vez de strings con formato ambiguo
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { raw: true });

        // Convertir fechas: XLSX entrega Date objects cuando cellDates:true y raw:true
        // Normalizamos para que inventory.ts las reciba en formato 'dd/MM/yyyy'
        const normalizedRows = (rawRows as any[]).map(row => {
          const newRow: any = { ...row };
          // La columna 'Fecha Doc' puede ser Date object o número serial de Excel
          const fechaKey = Object.keys(row).find(k =>
            k.toLowerCase().includes('fecha')
          );
          if (fechaKey && row[fechaKey]) {
            const val = row[fechaKey];
            if (val instanceof Date) {
              // Formatear como dd/MM/yyyy para que inventory.ts lo parsee correctamente
              const dd = String(val.getDate()).padStart(2, '0');
              const mm = String(val.getMonth() + 1).padStart(2, '0');
              const yyyy = val.getFullYear();
              newRow[fechaKey] = `${dd}/${mm}/${yyyy}`;
            } else if (typeof val === 'number') {
              // Excel serial date → JS Date
              const d = XLSX.SSF.parse_date_code(val);
              const dd = String(d.d).padStart(2, '0');
              const mm = String(d.m).padStart(2, '0');
              newRow[fechaKey] = `${dd}/${mm}/${d.y}`;
            }
          }
          return newRow;
        });

        const { articles, errors } = normalizeData(normalizedRows);
        setState({ articles, errors, fileName: EXCEL_NAME, loading: false });
      } catch (err) {
        console.error('Error cargando Excel:', err);
        setState(prev => ({
          ...prev,
          errors: [`No se pudo cargar ${EXCEL_NAME}: ${err}`],
          loading: false
        }));
      }
    };
    loadExcel();
  }, []);

  return state;
}
