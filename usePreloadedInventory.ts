// Hook que lee el Excel directamente del repositorio
// Para actualizar la BD: reemplaza "BASE DE DATOS COBROS.xlsx" en GitLab
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { normalizeData } from './inventory';
import { ArticleSummary } from './types';

// Importar el Excel como asset — Vite lo incluye automáticamente en el bundle
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
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

        const sheetName = workbook.SheetNames.find(n =>
          n.toUpperCase().includes('BASE') || n.toUpperCase().includes('DATO')
        ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          dateNF: 'dd/mm/yyyy'
        });

        const { articles, errors } = normalizeData(rawRows as any[]);
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
