// src/repositories/events.repository.js
import pool from '../db/pool.js';

/**
 * Cache de columnas por tabla para evitar queries repetidas a INFORMATION_SCHEMA.
 * key: tableName, value: Set(columnName)
 */
const tableColumnsCache = new Map();



async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) return tableColumnsCache.get(tableName);

  const sql = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
  `;
  const [rows] = await pool.query(sql, [tableName]);
  const cols = new Set(rows.map(r => r.COLUMN_NAME));
  tableColumnsCache.set(tableName, cols);
  return cols;
}

function pickPayloadFields(payload, allowedCols) {
  const entries = [];
  const values = [];
  for (const key of Object.keys(payload)) {
    if (allowedCols.has(key)) {
      entries.push(key);
      values.push(payload[key]);
    }
  }
  return { entries, values };
}

export async function insert(evento, conn) {
  const connection = conn || pool;
  const allowedCols = await getTableColumns('evento');

  // pick only keys that exist in the table
  const { entries, values } = pickPayloadFields(evento, allowedCols);

  if (entries.length === 0) {
    throw Object.assign(new Error('No hay campos válidos para insertar en evento'), { status: 400 });
  }

  const placeholders = entries.map(() => '?').join(', ');
  const sql = `INSERT INTO evento (${entries.join(',')}) VALUES (${placeholders})`;
  const [result] = await connection.query(sql, values);

  const insertedId = result.insertId;
  const [rows] = await connection.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [insertedId]);
  return rows[0] || null;
}

export async function findById(id) {
  const [rows] = await pool.query(`
    SELECT 
      e.*,
      a.avalPdf,
      a.tipoAval,
      GROUP_CONCAT(DISTINCT i.idInstalacion) AS instalacionesIds,
      GROUP_CONCAT(DISTINCT i.nombre) AS instalacionesNombres
    FROM evento e
    LEFT JOIN evento_instalacion ei ON e.idEvento = ei.idEvento
    LEFT JOIN instalacion i ON ei.idInstalacion = i.idInstalacion
    LEFT JOIN aval a ON e.idEvento = a.idEvento AND a.principal = 1
    WHERE e.idEvento = ?
    GROUP BY e.idEvento, a.avalPdf, a.tipoAval
    LIMIT 1
  `, [id]);

  if (!rows || rows.length === 0) return null;
  const evento = rows[0];

  const instalacionesIdsArray = evento.instalacionesIds
    ? evento.instalacionesIds.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const instalacionesObjArray = (evento.instalacionesNombres && instalacionesIdsArray.length)
    ? evento.instalacionesNombres.split(',').map((nombre, idx) => ({
        idInstalacion: instalacionesIdsArray[idx],
        nombre: nombre ? nombre.trim() : null
      }))
    : [];

  return {
    ...evento,
    fecha: evento.fecha || null,
    hora: evento.hora || null,
    horaFin: evento.horaFin || null,
    capacidad: evento.capacidad != null ? Number(evento.capacidad) : null,
    avalPdf: evento.avalPdf || null,
    tipoAval: evento.tipoAval || null,
    instalaciones: instalacionesObjArray,
    instalacionesIds: instalacionesIdsArray
  };

}
export async function findAll() {
  const [rows] = await pool.query('SELECT * FROM evento ORDER BY idEvento DESC');
  return rows;
}

export async function findByUniqueMatch({ nombre, fecha, hora }) {
  const [rows] = await pool.query(
    'SELECT * FROM evento WHERE nombre = ? AND fecha = ? AND hora = ? LIMIT 1',
    [nombre, fecha, hora]
  );
  return rows[0] || null;
}


export async function updateById(id, payload, conn) {
  const connection = conn || pool;
  const allowedCols = await getTableColumns('evento');
  const { entries, values } = pickPayloadFields(payload, allowedCols);
  if (entries.length === 0) {
    throw Object.assign(new Error('No hay campos válidos para actualizar en evento'), { status: 400 });
  }
  const setSql = entries.map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE evento SET ${setSql} WHERE idEvento = ?`;
  await connection.query(sql, [...values, id]);
  const [rows] = await connection.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [id]);
  return rows[0] || null;
}


export async function deleteById(id) {
  const [result] = await pool.query('DELETE FROM evento WHERE idEvento = ?', [id]);
  return result.affectedRows > 0;
}

/* ---------- helper functions to attach files to event ---------- */

/**
 * Attach aval info to event row. If your evento table already has avalPdf/tipoAval columns,
 * this will update them. Otherwise, implement alternative storage.
 */
export async function attachAval(idEvento, { avalPdf, tipoAval }, conn) {
  const connection = conn || pool;
  // check columns
  const allowedCols = await getTableColumns('evento');
  const updates = [];
  const params = [];
  if (allowedCols.has('avalPdf')) {
    updates.push('avalPdf = ?');
    params.push(avalPdf);
  }
  if (allowedCols.has('tipoAval')) {
    updates.push('tipoAval = ?');
    params.push(tipoAval);
  }
  if (updates.length === 0) return null;
  const sql = `UPDATE evento SET ${updates.join(', ')} WHERE idEvento = ?`;
  await connection.query(sql, [...params, idEvento]);
  const [rows] = await connection.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [idEvento]);
  return rows[0] || null;
}

/**
 * Attach general certificate path to event (certificadoParticipacion column)
 */
export async function attachGeneralCertificate(idEvento, { certificadoParticipacion }, conn) {
  const connection = conn || pool;
  const allowedCols = await getTableColumns('evento');
  if (!allowedCols.has('certificadoParticipacion')) {
    // if column doesn't exist, skip (or you can insert to a separate table)
    return null;
  }
  await connection.query('UPDATE evento SET certificadoParticipacion = ? WHERE idEvento = ?', [certificadoParticipacion, idEvento]);
  const [rows] = await connection.query('SELECT * FROM evento WHERE idEvento = ? LIMIT 1', [idEvento]);
  return rows[0] || null;
}

// ============================================
// NUEVA FUNCIÓN PARA DASHBOARD DE SECRETARIAS
// ============================================
export async function getAllEventsWithDetails() {
  // 1) obtener lista base de eventos (sin agregaciones)
  const [events] = await pool.query(`
    SELECT e.* FROM evento e
    ORDER BY e.fecha DESC, e.hora DESC
  `);

  // helper: safe single-row query
  async function singleRow(query, params = []) {
    try {
      const [rows] = await pool.query(query, params);
      return Array.isArray(rows) && rows.length ? rows[0] : null;
    } catch (err) {
      // no lanzar aquí: dejar que el llamador decida — devolvemos null
      console.error('singleRow query error:', err.sqlMessage || err.message);
      return null;
    }
  }

  // helper: safe multiple-rows query
  async function rowsQuery(query, params = []) {
    try {
      const [rows] = await pool.query(query, params);
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.error('rowsQuery error:', err.sqlMessage || err.message);
      return [];
    }
  }

  // helper: try several candidate table names for organization-event associative table
  async function getOrgAssociationsForEvent(idEvento) {
    const candidates = [
      { q: 'SELECT * FROM organization_event WHERE idEvento = ?', params: [idEvento] },
      { q: 'SELECT * FROM evento_organizacion WHERE idEvento = ?', params: [idEvento] },
      { q: 'SELECT * FROM organizacion_evento WHERE idEvento = ?', params: [idEvento] },
      { q: 'SELECT * FROM organization_evento WHERE idEvento = ?', params: [idEvento] },
      { q: 'SELECT * FROM organization_event_assoc WHERE idEvento = ?', params: [idEvento] }
    ];
    for (const c of candidates) {
      try {
        const [rows] = await pool.query(c.q, c.params);
        if (Array.isArray(rows) && rows.length) return rows;
      } catch (err) {
        // ignora y prueba siguiente candidato
      }
    }
    // si no hubo filas o ninguna tabla encontrada, devolver vacío
    return [];
  }

  // Para cada evento, recolectar detalles por consultas separadas (paralelizadas)
  const detailed = await Promise.all(events.map(async (e) => {
    const idEvento = e.idEvento || e.id;

    // 1. organizador (desde e.idUsuario)
    let organizador = null;
    if (e.idUsuario) {
      organizador = await singleRow(
        'SELECT idUsuario, nombre, apellidos, email, telefono FROM usuario WHERE idUsuario = ? LIMIT 1',
        [e.idUsuario]
      );
      // si el schema usa "id" en vez de idUsuario
      if (!organizador) {
        organizador = await singleRow(
          'SELECT id, nombre, apellidos, email, telefono FROM usuario WHERE id = ? LIMIT 1',
          [e.idUsuario]
        );
      }
    }

    // 2. instalaciones asociadas (evento_instalacion -> instalacion)
    // intentamos la tabla asociativa con los nombres más comunes
    const instAssocCandidates = [
      'SELECT i.idInstalacion, i.nombre, i.capacidad FROM instalacion i JOIN evento_instalacion ei ON i.idInstalacion = ei.idInstalacion WHERE ei.idEvento = ?',
      'SELECT i.id, i.nombre, i.capacidad FROM instalacion i JOIN evento_instalacion ei ON i.id = ei.idInstalacion WHERE ei.idEvento = ?',
      'SELECT i.idInstalacion, i.nombre, i.capacidad FROM instalacion i JOIN evento_instalaciones ei ON i.idInstalacion = ei.idInstalacion WHERE ei.idEvento = ?'
    ];
    let instalaciones = [];
    for (const q of instAssocCandidates) {
      const rows = await rowsQuery(q, [idEvento]);
      if (rows.length) { instalaciones = rows; break; }
    }

    // 3. aval principal (si existe)
    let aval = await singleRow('SELECT * FROM aval WHERE idEvento = ? AND principal = 1 LIMIT 1', [idEvento]);
    // fallback: si no existe con principal=1 pero hay una fila, tomar la primera
    if (!aval) {
      const alt = await singleRow('SELECT * FROM aval WHERE idEvento = ? LIMIT 1', [idEvento]);
      if (alt) aval = alt;
    }

    // 4. organizaciones asociadas (desde tabla asociativa)
    const orgAssocs = await getOrgAssociationsForEvent(idEvento);
    // mapear cada asociación a datos de organización y certificado si aplica
    const organizaciones = await Promise.all(orgAssocs.map(async (assoc) => {
      // determinar idOrganizacion en las posibles columnas
      const idOrg = assoc.idOrganizacion || assoc.organizacionId || assoc.org_id || assoc.id_organizacion || assoc.idOrg || assoc.id;
      if (!idOrg) {
        return {
          rawAssoc: assoc
        };
      }
      const org = await singleRow('SELECT idOrganizacion, nombre, sectorEconomico, representanteLegal FROM organizacion WHERE idOrganizacion = ? LIMIT 1', [idOrg])
        || await singleRow('SELECT id, nombre, sectorEconomico, representanteLegal FROM organizacion WHERE id = ? LIMIT 1', [idOrg])
        || await singleRow('SELECT idOrganizacion, nombre, sectorEconomico, representanteLegal FROM organization WHERE idOrganizacion = ? LIMIT 1', [idOrg])
        || null;

      // normalizar campos posibles en la asociación (participante, esRepresentanteLegal, certificadoParticipacion)
      const participante = assoc.participante || assoc.nombreEncargado || assoc.encargado || assoc.nombreParticipante || null;
      const esRep = (assoc.esRepresentanteLegal === 'si' || assoc.esRepresentanteLegal === 'true' || assoc.esRepresentanteLegal === true || assoc.representanteLegal === true);
      const certificado = assoc.certificadoParticipacion || assoc.certificado || assoc.cert_path || null;

      return {
        association: assoc,
        organizacion: org,
        participante,
        esRepresentanteLegal: !!esRep,
        certificadoPath: certificado
      };
    }));

    // 5. construir objeto final normalizado
    return {
      ...e,
      capacidad: (e.capacidad !== null && e.capacidad !== undefined) ? e.capacidad : null,
      ubicacion: e.ubicacion || '',
      descripcion: e.descripcion || '',
      organizador: organizador ? {
        idUsuario: organizador.idUsuario || organizador.id || null,
        nombre: `${(organizador.nombre || '')} ${(organizador.apellidos || '')}`.trim() || null,
        email: organizador.email || '',
        telefono: organizador.telefono || ''
      } : { idUsuario: null, nombre: null, email: '', telefono: '' },
      instalaciones: instalaciones.map(i => ({
        idInstalacion: i.idInstalacion || i.id || null,
        nombre: i.nombre || '',
        capacidad: i.capacidad != null ? Number(i.capacidad) : null
      })),
      aval: aval ? {
        avalPdf: aval.avalPdf || aval.path || null,
        tipoAval: aval.tipoAval || aval.tipo || null,
        idAval: aval.idAval || aval.id || null
      } : null,
      organizaciones
    };
  }));

  return detailed;
}

