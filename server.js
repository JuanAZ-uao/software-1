// Este archivo es el punto de entrada principal y enlaza toda la aplicación.

import { app } from './app.js';
import { env } from './src/config/index.js';
// Linkea la conexión a la base de datos (asegúrate que este archivo exista)
import './src/config/db.js';

const port = env.app.port;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
