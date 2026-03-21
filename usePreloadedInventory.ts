// Hook que lee el Excel directamente del repositorio (carpeta public/)
// Para actualizar la BD: reemplaza "BASE DE DATOS COBROS.xlsx" en la carpeta public/ de GitLab
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { normalizeData } from './inventory';
import { ArticleSummary } from './types';

// El Excel vive en /public — Vite lo sirve en la URL raíz automáticamente
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
        // Fetch the Excel file from /public folder
        const response = await fetch(EXCEL_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

        // Find the main data sheet
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
