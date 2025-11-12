-- Migration: Crear tabla notificaciones
-- Permite registrar notificaciones para usuarios sobre eventos
-- Tipos: 'enRevision' (evento enviado a revisión), 'evaluado' (evento evaluado)

USE gestionEventos;

CREATE TABLE IF NOT EXISTS notificacion (
    idNotificacion INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario INT NOT NULL,
    idEvento INT NOT NULL,
    tipo ENUM('enRevision', 'evaluado', 'aprobado', 'rechazado') NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    leida BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP NULL,
    
    CONSTRAINT fk_notif_usuario FOREIGN KEY (idUsuario)
        REFERENCES usuario(idUsuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    
    CONSTRAINT fk_notif_evento FOREIGN KEY (idEvento)
        REFERENCES evento(idEvento)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    
    INDEX idx_usuario_leida (idUsuario, leida),
    INDEX idx_evento (idEvento),
    INDEX idx_fecha (fecha_creacion)
);
