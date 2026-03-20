# Sistema de Auditoría de Inventarios

## Configuración en Vercel

### Paso 1 — Importar el repositorio
1. Ir a https://vercel.com/new
2. Conectar el repositorio de GitLab
3. Vercel detectará Vite automáticamente

### Paso 2 — Configuración del proyecto (IMPORTANTE)
En la pantalla de configuración de Vercel, asegurarse de:

| Campo | Valor |
|-------|-------|
| Framework Preset | **Vite** |
| Root Directory | **./** (dejar vacío) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | **18.x** |

### Paso 3 — Deploy
Hacer clic en **Deploy**. El primer deploy toma ~2 minutos.

## Actualizar la Base de Datos

Para cargar datos nuevos:
1. Ir a GitLab → carpeta `public/`
2. Seleccionar **"BASE DE DATOS COBROS.xlsx"**
3. Clic en el ícono de **reemplazar archivo**
4. Subir el nuevo Excel
5. Vercel redeploya automáticamente en ~1 minuto

## Desarrollo local

```bash
npm install
npm run dev
# Abrir http://localhost:5173
```
