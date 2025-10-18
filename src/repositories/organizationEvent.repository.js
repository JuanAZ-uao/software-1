import pool from '../db/pool.js';

/**
 * Inserta o actualiza (upsert) una relación organizacion_evento.
 * Devuelve la fila resultante de organizacion_evento.
 */
export async function upsert(record, conn) {
  const connection = conn || pool;
  const sql = `
    INSERT INTO organizacion_evento
      (idOrganizacion, idEvento, participante, esRepresentanteLegal, certificadoParticipacion)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      participante = VALUES(participante),
      esRepresentanteLegal = VALUES(esRepresentanteLegal),
      certificadoParticipacion = VALUES(certificadoParticipacion)
  `;
  const params = [
    record.idOrganizacion,
    record.idEvento,
    record.participante || '',
    record.esRepresentanteLegal || 'no',
    record.certificadoParticipacion || null
  ];
  await connection.query(sql, params);
  const [rows] = await connection.query(
    'SELECT * FROM organizacion_evento WHERE idEvento = ? AND idOrganizacion = ? LIMIT 1',
    [record.idEvento, record.idOrganizacion]
  );
  return rows[0] || null;
}

/**
 * Mantengo insert por compatibilidad (simple insert sin upsert).
 * Puedes preferir llamar a upsert en vez de insert desde service.
 */
export async function insert(record, conn) {
  const connection = conn || pool;
  const sql = `INSERT INTO organizacion_evento (idOrganizacion, idEvento, participante, esRepresentanteLegal, certificadoParticipacion)
               VALUES (?, ?, ?, ?, ?)`;
  const params = [record.idOrganizacion, record.idEvento, record.participante, record.esRepresentanteLegal, record.certificadoParticipacion];
  const [result] = await connection.query(sql, params);
  const [rows] = await connection.query('SELECT * FROM organizacion_evento WHERE idEvento = ? AND idOrganizacion = ? LIMIT 1', [record.idEvento, record.idOrganizacion]);
  return rows[0] || null;
}

export async function deleteByEvent(idEvento, conn) {
  const connection = conn || pool;
  const [result] = await connection.query('DELETE FROM organizacion_evento WHERE idEvento = ?', [idEvento]);
  return result.affectedRows;
}

/**
 * findByEvent: devuelve lista de asociaciones para un evento,
 * cada fila incluye datos de la organización (join) para facilitar precarga en frontend.
 * Retorna estructura normalizada:
 * {
 *   idOrganizacion,
 *   idEvento,
 *   participante,
 *   esRepresentanteLegal,
 *   certificadoParticipacion,
 *   org: { idOrganizacion, nombre, sectorEconomico, representanteLegal, ... }
 * }
 */
export async function findByEvent(idEvento, conn) {
  const connection = conn || pool;
  const sql = `
    SELECT oe.idOrganizacion, oe.idEvento, oe.participante, oe.esRepresentanteLegal, oe.certificadoParticipacion,
           o.idOrganizacion AS org_idOrganizacion, o.nombre AS org_nombre, o.sectorEconomico AS org_sectorEconomico,
           o.representanteLegal AS org_representanteLegal, o.ubicacion AS org_ubicacion, o.direccion AS org_direccion,
           o.telefono AS org_telefono
    FROM organizacion_evento oe
    LEFT JOIN organizacion o ON o.idOrganizacion = oe.idOrganizacion
    WHERE oe.idEvento = ?
  `;
  const [rows] = await connection.query(sql, [idEvento]);
  // map rows to a friendly shape
  return rows.map(r => ({
    idOrganizacion: r.idOrganizacion,
    idEvento: r.idEvento,
    participante: r.participante,
    esRepresentanteLegal: r.esRepresentanteLegal,
    certificadoParticipacion: r.certificadoParticipacion,
    org: {
      idOrganizacion: r.org_idOrganizacion,
      nombre: r.org_nombre,
      sectorEconomico: r.org_sectorEconomico,
      representanteLegal: r.org_representanteLegal,
      ubicacion: r.org_ubicacion,
      direccion: r.org_direccion,
      telefono: r.org_telefono
    }
  }));
}
