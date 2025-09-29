import 'dotenv/config';

const numberFrom = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  app: {
    port: numberFrom(process.env.PORT, 3000)
  },
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME ?? 'gestionEventos',
    port: numberFrom(process.env.DB_PORT, 3306),
    connectionLimit: numberFrom(process.env.DB_POOL_LIMIT, 10)
  }
});
export default env;
