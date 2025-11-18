// src/repositories/organizations.repository.js
import pool from '../db/pool.js';


export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM organizacion WHERE idOrganizacion = ? LIMIT 1', [id]);
  return rows[0] || null;
}

// export other helpers if you have them (optional)
export async function findAll() {
  const [rows] = await pool.query('SELECT * FROM organizacion ORDER BY idOrganizacion DESC');
  return rows;
}


export async function insert(data, userId) {
  const [result] = await pool.query(
    `INSERT INTO organizacion 
      (nombre, representanteLegal, nit, ubicacion, direccion, ciudad, sectorEconomico, actividadPrincipal, telefono, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      data.representanteLegal,
      data.nit || null,
      data.ubicacion || null,
      data.direccion || null,
      data.ciudad || null,
      data.sectorEconomico || null,
      data.actividadPrincipal || null,
      data.telefono || null,
      userId !== undefined ? userId : null
    ]
  );

  // devolver objeto creado, incluyendo created_by
  return {
    idOrganizacion: result.insertId,
    nombre: data.nombre,
    representanteLegal: data.representanteLegal,
    nit: data.nit || null,
    ubicacion: data.ubicacion || null,
    direccion: data.direccion || null,
    ciudad: data.ciudad || null,
    sectorEconomico: data.sectorEconomico || null,
    actividadPrincipal: data.actividadPrincipal || null,
    telefono: data.telefono || null,
    created_by: userId !== undefined ? userId : null
  };
}

export async function updateById(id, data) {
  await pool.query(
    `UPDATE organizacion SET
      nombre = ?, representanteLegal = ?, nit = ?, ubicacion = ?, direccion = ?, ciudad = ?, sectorEconomico = ?, actividadPrincipal = ?, telefono = ?
     WHERE idOrganizacion = ?`,
    [
      data.nombre,
      data.representanteLegal,
      data.nit || null,
      data.ubicacion || null,
      data.direccion || null,
      data.ciudad || null,
      data.sectorEconomico || null,
      data.actividadPrincipal || null,
      data.telefono || null,
      id
    ]
  );
  // devolver objeto actualizado
  return { idOrganizacion: Number(id), ...data };
}

export async function deleteById(id) {
  const [result] = await pool.query(
    'DELETE FROM organizacion WHERE idOrganizacion = ?',
    [id]
  );
  return result.affectedRows > 0;
}

