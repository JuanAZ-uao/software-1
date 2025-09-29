// Punto de entrada principal: enlaza configuración, base de datos y app.
import { app } from './app.js';
import crypto from "crypto";
import { env } from './src/config/index.js';
// Linkea la conexión a la base de datos (asegúrate que este archivo exista)
import './src/db/pool.js';

const port = env.app.port;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
let tokens = {}; // email -> token temporal

// Paso 1: generar token
app.post('/api/auth/request-token', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requerido' });

  const token = crypto.randomBytes(3).toString('hex'); // ej: "a1f3c9"
  tokens[email] = token;

  console.log(`🔑 Token para ${email}: ${token}`);
  res.json({ message: 'Token generado' });
});

// Paso 2: validar token
app.post('/api/auth/validate-token', (req, res) => {
  const { token } = req.body;
  const email = Object.keys(tokens).find(e => tokens[e] === token);
  if (email) {
    return res.json({ valid: true, email });
  }
  res.json({ valid: false });
});

// Paso 3: reset password
app.post('/api/auth/reset-password', async (req, res) => {
  const { password } = req.body;
  // aquí deberías saber qué email estaba validado
  const email = Object.keys(tokens)[0]; // simplificado
  if (!email) return res.status(400).json({ message: 'No hay email asociado al token' });

  // Actualizar en base de datos (ejemplo con SQL)
  await db.query("UPDATE usuarios SET password = ? WHERE email = ?", [password, email]);

  delete tokens[email]; // invalidar token
  res.json({ message: 'Contraseña actualizada' });
});