// ============================================================
//  app.js — Lógica principal de la aplicación
// ============================================================

const MODEL_URL = '/model/';  // Ruta al modelo exportado de Teachable Machine

let model = null;
let webcamObj = null;
let loop = null;
let camaraActiva = false;

// Íconos por clase
const ICONS = {
  'Lapicero': '🖊️',
  'Cuaderno': '📓',
  'Celular':  '📱',
  'Reloj':    '⌚'
};

// ─── Elementos del DOM ─────────────────────────────────────
const btnCamara    = document.getElementById('btnCamara');
const btnRegistrar = document.getElementById('btnRegistrar');
const btnLimpiarTodo = document.getElementById('btnLimpiarTodo');
const videoEl      = document.getElementById('webcam');
const videoOverlay = document.getElementById('videoOverlay');
const scanLine     = document.getElementById('scanLine');
const predObjeto   = document.getElementById('predObjeto');
const predConfianza = document.getElementById('predConfianza');
const confidenceBar = document.getElementById('confidenceBar');
const estadoBadge  = document.getElementById('estadoBadge');
const estadoTexto  = document.getElementById('estadoTexto');
const clasesGrid   = document.getElementById('clasesGrid');
const tbodyInventario = document.getElementById('tbodyInventario');
const totalRegistros  = document.getElementById('totalRegistros');

// ─── Estado actual de predicción ──────────────────────────
let prediccionActual = { objeto: null, confianza: 0, estado: '' };

// ============================================================
//  CARGAR MODELO
// ============================================================
async function cargarModelo() {
  try {
    const modelURL    = MODEL_URL + 'model.json';
    const metadataURL = MODEL_URL + 'metadata.json';
    model = await tmImage.load(modelURL, metadataURL);
    console.log('✅ Modelo cargado');
  } catch (e) {
    console.error('❌ Error al cargar el modelo:', e);
    alert('⚠️ No se pudo cargar el modelo.\nAsegúrate de copiar los archivos model.json, metadata.json y weights.bin en public/model/');
  }
}

// ============================================================
//  CÁMARA
// ============================================================
btnCamara.addEventListener('click', async () => {
  if (!camaraActiva) {
    await iniciarCamara();
  } else {
    detenerCamara();
  }
});

async function iniciarCamara() {
  if (!model) {
    await cargarModelo();
    if (!model) return;
  }

  try {
    webcamObj = new tmImage.Webcam(400, 300, true); // ancho, alto, voltear
    await webcamObj.setup();
    await webcamObj.play();

    // Insertar stream en el <video>
    videoEl.srcObject = webcamObj.webcam.srcObject;
    videoOverlay.classList.add('hidden');
    scanLine.classList.add('active');

    camaraActiva = true;
    btnCamara.innerHTML = '<span>⏹</span> Detener Cámara';
    btnCamara.style.background = 'var(--red)';
    btnRegistrar.disabled = false;

    loop = window.requestAnimationFrame(predecirLoop);
  } catch (e) {
    console.error('Error al iniciar cámara:', e);
    alert('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
  }
}

function detenerCamara() {
  if (webcamObj) {
    webcamObj.stop();
    webcamObj = null;
  }
  if (loop) {
    cancelAnimationFrame(loop);
    loop = null;
  }

  videoEl.srcObject = null;
  videoOverlay.classList.remove('hidden');
  scanLine.classList.remove('active');

  camaraActiva = false;
  btnCamara.innerHTML = '<span>▶</span> Iniciar Cámara';
  btnCamara.style.background = '';
  btnRegistrar.disabled = true;

  // Reset predicción
  predObjeto.textContent = '—';
  predConfianza.textContent = '0%';
  confidenceBar.style.width = '0%';
  estadoBadge.className = 'estado-badge';
  estadoTexto.textContent = 'Esperando predicción...';
  clasesGrid.innerHTML = '';
  prediccionActual = { objeto: null, confianza: 0, estado: '' };
}

// ============================================================
//  LOOP DE PREDICCIÓN
// ============================================================
async function predecirLoop() {
  if (!camaraActiva || !webcamObj || !model) return;

  webcamObj.update();
  await predecir();
  loop = requestAnimationFrame(predecirLoop);
}

async function predecir() {
  if (!model || !webcamObj) return;

  const predictions = await model.predict(webcamObj.canvas);

  // Encontrar la predicción más alta
  let mejor = predictions.reduce((a, b) => a.probability > b.probability ? a : b);

  const pct   = mejor.probability * 100;
  const clase = mejor.className;
  const estado = clasificarEstado(pct);

  prediccionActual = { objeto: clase, confianza: pct, estado };

  // Actualizar UI
  predObjeto.textContent = `${ICONS[clase] || '📦'} ${clase}`;
  predConfianza.textContent = `${pct.toFixed(1)}%`;

  confidenceBar.style.width = `${pct}%`;
  confidenceBar.style.background = colorEstado(estado);

  estadoBadge.className = `estado-badge ${estado}`;
  estadoTexto.textContent = textoEstado(estado);

  // Barras por clase
  renderizarClases(predictions);
}

// ─── Clasificar según regla de confianza ──────────────────
function clasificarEstado(pct) {
  if (pct >= 80) return 'confiable';
  if (pct >= 50) return 'probable';
  return 'inseguro';
}

function textoEstado(estado) {
  if (estado === 'confiable') return '✅ Resultado confiable (≥80%)';
  if (estado === 'probable')  return '⚠️ Resultado probable (50-79%)';
  return '❌ Resultado inseguro (<50%)';
}

function colorEstado(estado) {
  if (estado === 'confiable') return 'var(--green)';
  if (estado === 'probable')  return 'var(--yellow)';
  return 'var(--red)';
}

// ─── Barras por clase ─────────────────────────────────────
function renderizarClases(predictions) {
  clasesGrid.innerHTML = predictions.map(p => {
    const pct = (p.probability * 100).toFixed(1);
    return `
      <div class="clase-item">
        <span class="clase-nombre">${p.className}</span>
        <div class="clase-bar-wrap">
          <div class="clase-bar" style="width:${pct}%"></div>
        </div>
        <span class="clase-pct">${pct}%</span>
      </div>
    `;
  }).join('');
}

// ============================================================
//  REGISTRAR OBJETO
// ============================================================
btnRegistrar.addEventListener('click', async () => {
  if (!prediccionActual.objeto) return;

  if (prediccionActual.estado === 'inseguro') {
    const confirmar = confirm(`La confianza es baja (${prediccionActual.confianza.toFixed(1)}%).\n¿Deseas registrar de todas formas?`);
    if (!confirmar) return;
  }

  try {
    const res = await fetch('/api/inventario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objeto:    prediccionActual.objeto,
        confianza: prediccionActual.confianza,
        estado:    prediccionActual.estado
      })
    });

    if (res.ok) {
      const nuevo = await res.json();
      agregarFilaTabla(nuevo, true);
      actualizarTotal();

      // Feedback visual
      btnRegistrar.innerHTML = '<span>✓</span> Registrado';
      btnRegistrar.style.background = 'var(--green)';
      setTimeout(() => {
        btnRegistrar.innerHTML = '<span>＋</span> Registrar';
        btnRegistrar.style.background = '';
      }, 1500);
    }
  } catch (e) {
    console.error('Error al registrar:', e);
    alert('Error al conectar con el servidor.');
  }
});

// ============================================================
//  INVENTARIO — Cargar al inicio
// ============================================================
async function cargarInventario() {
  try {
    const res = await fetch('/api/inventario');
    const data = await res.json();

    tbodyInventario.innerHTML = '';

    if (data.length === 0) {
      tbodyInventario.innerHTML = '<tr class="empty-row"><td colspan="6">Sin registros aún</td></tr>';
    } else {
      data.forEach(item => agregarFilaTabla(item, false));
    }
    actualizarTotal(data.length);
  } catch (e) {
    console.error('Error al cargar inventario:', e);
  }
}

// ─── Agregar fila a la tabla ───────────────────────────────
function agregarFilaTabla(item, isNew) {
  // Quitar fila vacía si existe
  const emptyRow = tbodyInventario.querySelector('.empty-row');
  if (emptyRow) emptyRow.remove();

  const icon  = ICONS[item.objeto] || '📦';
  const tagClass = `tag-${item.estado}`;
  const etiqueta = item.estado === 'confiable' ? 'CONFIABLE' :
                   item.estado === 'probable'  ? 'PROBABLE'  : 'INSEGURO';

  const numFilas = tbodyInventario.querySelectorAll('tr:not(.empty-row)').length + 1;

  const tr = document.createElement('tr');
  if (isNew) tr.classList.add('new-row');

  tr.innerHTML = `
    <td><span style="color:var(--text2);font-family:var(--font-mono);font-size:0.7rem">${numFilas}</span></td>
    <td><span class="tag-objeto">${icon} ${item.objeto}</span></td>
    <td><span class="tag-confianza">${item.confianza.toFixed(1)}%</span></td>
    <td><span class="tag-estado ${tagClass}">${etiqueta}</span></td>
    <td><span class="fecha-cell">${item.fecha}</span></td>
    <td><button class="btn-delete" data-id="${item.id}" title="Eliminar">🗑</button></td>
  `;

  tr.querySelector('.btn-delete').addEventListener('click', () => eliminarRegistro(item.id, tr));

  tbodyInventario.insertBefore(tr, tbodyInventario.firstChild);
}

// ─── Eliminar registro ─────────────────────────────────────
async function eliminarRegistro(id, trEl) {
  try {
    const res = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
    if (res.ok) {
      trEl.style.opacity = '0';
      trEl.style.transform = 'translateX(20px)';
      trEl.style.transition = 'all 0.3s';
      setTimeout(() => {
        trEl.remove();
        actualizarTotal();
        if (tbodyInventario.querySelectorAll('tr:not(.empty-row)').length === 0) {
          tbodyInventario.innerHTML = '<tr class="empty-row"><td colspan="6">Sin registros aún</td></tr>';
        }
      }, 300);
    }
  } catch (e) {
    console.error('Error al eliminar:', e);
  }
}

// ─── Limpiar todo ─────────────────────────────────────────
btnLimpiarTodo.addEventListener('click', async () => {
  const filas = tbodyInventario.querySelectorAll('tr:not(.empty-row)');
  if (filas.length === 0) return;

  if (!confirm(`¿Eliminar todos los ${filas.length} registros?`)) return;

  // Obtener todos los IDs y eliminar uno a uno
  const ids = [...filas].map(tr => tr.querySelector('.btn-delete')?.dataset.id).filter(Boolean);
  for (const id of ids) {
    await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
  }

  tbodyInventario.innerHTML = '<tr class="empty-row"><td colspan="6">Sin registros aún</td></tr>';
  actualizarTotal(0);
});

// ─── Actualizar contador ───────────────────────────────────
function actualizarTotal(n) {
  if (n !== undefined) {
    totalRegistros.textContent = n;
  } else {
    const filas = tbodyInventario.querySelectorAll('tr:not(.empty-row)').length;
    totalRegistros.textContent = filas;
  }
}

// ============================================================
//  INICIALIZACIÓN
// ============================================================
cargarInventario();
// Pre-cargar modelo al abrir la página (opcional, para más rapidez)
cargarModelo();
