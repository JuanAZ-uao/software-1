import { env } from '../config/index.js';

let poolPromise;

const createPool = async () => {
  if (!poolPromise) {
    poolPromise = import('mysql2/promise')
      .then(({ default: mysql }) =>
        mysql.createPool({
          host: env.db.host,
          user: env.db.user,
          password: env.db.password,
          database: env.db.database,
          port: env.db.port,
          waitForConnections: true,
          connectionLimit: env.db.connectionLimit,
          queueLimit: 0
        })
      );
  }
  return poolPromise;
};

export const getPool = () => createPool();
            error.message
        );
      });
  }

  return poolPromise;
};

export const getPool = () => createPool();
