import pool from '../db/pool.js';

export async function findAll() {
  const [rows] = await pool.query(
    'SELECT * FROM organizacion ORDER BY idOrganizacion DESC'
  );
  return rows;
}

export async function insert(data) {
  const [result] = await pool.query(
    `INSERT INTO organizacion 
      (nombre, representanteLegal, ubicacion, direccion, ciudad, sectorEconomico, actividadPrincipal, telefono)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      data.representanteLegal,
      data.ubicacion,
      data.direccion,
      data.ciudad,
      data.sectorEconomico,
      data.actividadPrincipal,
      data.telefono
    ]
  );
  return { idOrganizacion: result.insertId, ...data };
}

export async function updateById(id, data) {
  const [result] = await pool.query(
    `UPDATE organizacion SET
      nombre = ?, representanteLegal = ?, ubicacion = ?, direccion = ?, ciudad = ?, sectorEconomico = ?, actividadPrincipal = ?, telefono = ?
     WHERE idOrganizacion = ?`,
    [
      data.nombre,
      data.representanteLegal,
      data.ubicacion,
      data.direccion,
      data.ciudad,
      data.sectorEconomico,
      data.actividadPrincipal,
      data.telefono,
      id
    ]
  );
  // devolver objeto actualizado (no hacemos SELECT extra; devolvemos id + data)
  return { idOrganizacion: Number(id), ...data };
}

export async function deleteById(id) {
  const [result] = await pool.query(
    'DELETE FROM organizacion WHERE idOrganizacion = ?',
    [id]
  );
  return result.affectedRows > 0;
}