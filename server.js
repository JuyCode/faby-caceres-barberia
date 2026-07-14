import express from 'express';
import cors from 'cors';
import { createClient } from '@libsql/client';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS turnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      barbero TEXT NOT NULL,
      servicio TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      pago TEXT,
      precio TEXT,
      whatsapp_cliente TEXT,
      whatsapp_barbero TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✅ Tabla turnos lista en Turso');
}

app.get('/api/horarios-ocupados', async (req, res) => {
  let { fecha, barbero } = req.query;
  console.log(`🔍 Horarios ocupados: ${barbero} el ${fecha}`);

  try {
    const result = await db.execute({
      sql: 'SELECT hora FROM turnos WHERE fecha = ? AND barbero = ?',
      args: [fecha, barbero],
    });
    const horarios = result.rows.map(r => r.hora);
    return res.json({ success: true, horariosOcupados: horarios });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({ success: false, error: 'Error al consultar horarios' });
  }
});

app.post('/api/nuevo-turno', async (req, res) => {
  const { cliente, barbero, servicio, fecha, hora, pago, precio, whatsapp_cliente, whatsapp_barbero } = req.body;
  console.log(`📡 Nuevo turno: ${cliente} con ${barbero}`);

  try {
    const duplicado = await db.execute({
      sql: 'SELECT id FROM turnos WHERE fecha = ? AND hora = ? AND barbero = ?',
      args: [fecha, hora, barbero],
    });

    if (duplicado.rows.length > 0) {
      return res.status(400).json({ success: false, error: `El horario de las ${hora} ya fue reservado.` });
    }

    await db.execute({
      sql: `INSERT INTO turnos (cliente, barbero, servicio, fecha, hora, pago, precio, whatsapp_cliente, whatsapp_barbero)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [cliente, barbero, servicio, fecha, hora, pago, precio, whatsapp_cliente, whatsapp_barbero],
    });

    console.log(`💾 Turno guardado para ${cliente}`);
    return res.json({ success: true, message: 'Turno guardado correctamente' });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({ success: false, error: 'Error al guardar el turno' });
  }
});

app.get('/api/turnos', async (req, res) => {
  const { fecha, mes } = req.query;

  try {
    let result;
    if (fecha) {
      result = await db.execute({
        sql: 'SELECT * FROM turnos WHERE fecha = ? ORDER BY hora ASC',
        args: [fecha],
      });
    } else if (mes) {
      const inicio = mes + '-01';
      const fin = mes + '-31';
      result = await db.execute({
        sql: 'SELECT * FROM turnos WHERE fecha >= ? AND fecha <= ? ORDER BY fecha ASC',
        args: [inicio, fin],
      });
    } else {
      return res.status(400).json({ success: false, error: 'Fecha o mes requerido' });
    }

    return res.json({ success: true, turnos: result.rows });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({ success: false, error: 'Error al consultar turnos' });
  }
});

app.use(express.static('.'));

app.listen(PORT, () => {
  initDB().then(() => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  }).catch(err => {
    console.error('❌ Error al iniciar:', err.message);
  });
});