// Punto de entrada principal: enlaza configuración, base de datos y app.
import { app } from './app.js';
import { env } from './src/config/index.js';
// Linkea la conexión a la base de datos (asegúrate que este archivo exista)
import './src/db/pool.js';

const port = env.app.port;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
