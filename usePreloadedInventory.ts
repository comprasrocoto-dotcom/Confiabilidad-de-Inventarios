import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { normalizeData } from './inventory';
import { ArticleSummary } from './types';

// El Excel vive en /public/ y se sirve como archivo estático
// Para actualizar: reemplaza public/base-datos-cobros.xlsx en GitLab
const EXCEL_URL = '/base-datos-cobros.xlsx';
const EXCEL_NAME = 'base-datos-cobros.xlsx';

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
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
              newRow[fechaKey] = `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
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
          errors: [`Error cargando base de datos: ${err}`],
          loading: false
        }));
      }
    };
    loadExcel();
  }, []);

  return state;
}
