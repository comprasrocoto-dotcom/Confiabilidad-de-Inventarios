// Hook que lee el Excel desde la carpeta public/ del repositorio
// Para actualizar la BD: reemplaza el archivo en GitLab → carpeta "public/"
// El nombre del archivo debe ser exactamente: BASE DE DATOS COBROS.xlsx
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { normalizeData } from './inventory';
import { ArticleSummary } from './types';

// Vite sirve /public como raíz estática — no se bundlea, solo se sirve
const EXCEL_URL = '/BASE DE DATOS COBROS.xlsx';
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
        const response = await fetch(EXCEL_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status} — no se encontró ${EXCEL_NAME}`);

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

        const sheetName = workbook.SheetNames.find(n =>
          n.toUpperCase().includes('BASE') || n.toUpperCase().includes('DATO')
        ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { raw: true });

        const normalizedRows = (rawRows as any[]).map(row => {
          const newRow: any = { ...row };
          const fechaKey = Object.keys(row).find(k => k.toLowerCase().includes('fecha'));
          if (fechaKey && row[fechaKey]) {
            const val = row[fechaKey];
            if (val instanceof Date) {
              const dd = String(val.getDate()).padStart(2, '0');
              const mm = String(val.getMonth() + 1).padStart(2, '0');
              const yyyy = val.getFullYear();
              newRow[fechaKey] = `${dd}/${mm}/${yyyy}`;
            } else if (typeof val === 'number') {
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
