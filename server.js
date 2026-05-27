const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'inventario.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Asegurarse de que el archivo JSON existe
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// GET /api/inventario - Obtener todos los registros
app.get('/api/inventario', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Error al leer el inventario' });
  }
});

// POST /api/inventario - Agregar un nuevo registro
app.post('/api/inventario', (req, res) => {
  try {
    const { objeto, confianza, estado } = req.body;

    if (!objeto || confianza === undefined) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    const nuevoRegistro = {
      id: Date.now(),
      objeto,
      confianza: parseFloat(confianza.toFixed(2)),
      estado,
      fecha: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })
    };

    data.push(nuevoRegistro);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    res.status(201).json(nuevoRegistro);
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar el registro' });
  }
});

// DELETE /api/inventario/:id - Eliminar un registro por ID
app.delete('/api/inventario/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    const index = data.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    data.splice(index, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    res.json({ mensaje: 'Registro eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el registro' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
