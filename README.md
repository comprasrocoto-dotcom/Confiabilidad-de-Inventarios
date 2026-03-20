# Sistema de Auditoría de Inventarios v2.0

Sistema profesional de cruce de inventarios y cobros por sede.

## Características

- **Base de datos preintegrada**: 1,771 registros listos (Malanga, Rocoto Laureles, Rocoto Amsterdam, Rocoto Provenza, Hot Wings)
- **Márgenes de error calibrados**: Onzas y Copas ±3 | Gramos >1,000g | Unidades >1
- **Informe comparativo de barras**: Faltantes vs Sobrantes por sede con semáforo visual
- **Confiabilidad por sede**: Ranking, mapa de calor, y reportes PDF/Excel
- **Trazabilidad histórica**: Análisis por mes/semana/día
- **Paleta profesional**: Navy institucional + dorado auditor

## Instalación

```bash
npm install
npm run dev
```

Abrir en: http://localhost:3000

## Uso

La aplicación carga automáticamente la base de datos del repositorio al iniciar.
Para analizar un nuevo Excel, usar el botón **Cargar Excel** en el header.

## Unidades y márgenes de error

| Unidad    | Margen para cobro |
|-----------|-------------------|
| ONZA      | > 3 oz diferencia |
| COPA      | > 3 copas         |
| GRAMOS    | > 1,000 g         |
| UNIDADES  | > 1 unidad        |
