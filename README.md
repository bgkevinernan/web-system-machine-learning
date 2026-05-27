# 🎒 UtilES-ML — Inventario Escolar con Machine Learning

## Estructura del proyecto
```
utiles-escolares-ml/
├── server.js
├── package.json
├── data/
│   └── inventario.json
└── public/
    ├── index.html
    ├── css/
    │   └── estilos.css
    ├── js/
    │   └── app.js
    └── model/          ← ¡DEBES COPIAR TU MODELO AQUÍ!
        ├── model.json
        ├── metadata.json
        └── weights.bin
```

---

## PASO A PASO

### 1. Entrenar el modelo en Teachable Machine
1. Ir a https://teachablemachine.withgoogle.com/
2. Clic en **Get Started** → **Image Project** → **Standard image model**
3. Crear 4 clases: `Lapicero`, `Cuaderno`, `Celular`, `Reloj`
4. Capturar mínimo **25 imágenes por clase** (varía el ángulo e iluminación)
5. Clic en **Train Model**
6. Clic en **Export Model** → pestaña **Tensorflow.js** → **Download my model**

### 2. Copiar el modelo al proyecto
1. Descomprimir el archivo descargado
2. Copiar los 3 archivos (`model.json`, `metadata.json`, `weights.bin`)
   dentro de la carpeta `public/model/`

### 3. Instalar dependencias
Abre una terminal en VS Code (`Ctrl + ñ`) y ejecuta:
```bash
npm install
```

### 4. Ejecutar el servidor
```bash
npm start
```

### 5. Abrir en el navegador
Ir a: **http://localhost:3000**

---

## Uso de la aplicación
1. Clic en **Iniciar Cámara**
2. Mostrar un útil escolar frente a la cámara
3. Ver la predicción y el nivel de confianza
4. Clic en **Registrar** para guardarlo en el inventario
5. Los registros se guardan en `data/inventario.json`

## Regla de confianza
| Confianza | Estado |
|-----------|--------|
| ≥ 80%     | ✅ Confiable |
| 50–79%    | ⚠️ Probable (requiere revisión) |
| < 50%     | ❌ Inseguro (no recomendado) |
