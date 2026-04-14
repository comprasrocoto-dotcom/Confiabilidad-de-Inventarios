# Sistema de Auditoría de Inventarios

## Estructura del proyecto

```
/
├── public/
│   └── BASE DE DATOS COBROS.xlsx  ← ÚNICA ubicación del Excel
├── inventory.ts
├── ReliabilityView.tsx
└── ...
```

## ✅ Cómo actualizar la base de datos

1. Ir a GitLab → carpeta **`public/`**
2. Seleccionar **`BASE DE DATOS COBROS.xlsx`**
3. Clic en **Reemplazar** → subir el nuevo archivo
4. Vercel redeploya automáticamente (~1 min)

> ⚠️ El archivo DEBE llamarse exactamente `BASE DE DATOS COBROS.xlsx`
> ⚠️ Debe estar en la carpeta `public/`, NO en la raíz

## Desarrollo local

```bash
npm install --legacy-peer-deps
npm run dev
```
