-- CREAR BASE DE DATOS
DROP DATABASE IF EXISTS gestionEventos;
CREATE DATABASE IF NOT EXISTS gestionEventos;
USE gestionEventos;

-- TABLAS BASE

-- Tabla Facultad
CREATE TABLE facultad (
    idFacultad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- Tabla Unidad Académica (pertenece a una Facultad)
CREATE TABLE unidadAcademica (
    idUnidadAcademica INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    idFacultad INT NOT NULL,
    CONSTRAINT fk_unidad_facultad
        FOREIGN KEY (idFacultad) REFERENCES facultad(idFacultad)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla Programa (pertenece a una Facultad)
CREATE TABLE programa (
    idPrograma INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    idFacultad INT NOT NULL,
    CONSTRAINT fk_programa_facultad
        FOREIGN KEY (idFacultad) REFERENCES facultad(idFacultad)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla Documento
CREATE TABLE documento (
    id INT AUTO_INCREMENT PRIMARY KEY
);

-- Tabla Usuario (superclase)
CREATE TABLE usuario (
    idUsuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    documento INT NOT NULL UNIQUE,
    CONSTRAINT fk_usuario_documento
    FOREIGN KEY (documento)
    REFERENCES documento(id)
);

-- Tabla Contraseña
CREATE TABLE contraseña(
    idContrasena INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario INT NOT NULL,
    fechaCambio DATE NOT NULL,
    clave VARCHAR(255) NOT NULL,
    estado ENUM('activa','inactiva') NOT NULL,
    CONSTRAINT fk_contrasena_usuario
        FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla Instalación
CREATE TABLE instalacion (
    idInstalacion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(150),
    capacidad INT,
    tipo ENUM('salon', 'auditorio', 'laboratorio', 'cancha') NOT NULL
);

-- TABLAS DE HERENCIA (subclases de la tabla usuario)

-- Estudiante (Usuario que pertence a un programa)
CREATE TABLE estudiante (
    idUsuario INT PRIMARY KEY,
    idPrograma INT NOT NULL,
    CONSTRAINT fk_estudiante_usuario
        FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_estudiante_programa
        FOREIGN KEY (idPrograma) REFERENCES programa(idPrograma)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Docente (Usuario que esta adscrito a una Unidad Académica)
CREATE TABLE docente (
    idUsuario INT PRIMARY KEY,
    idUnidadAcademica INT NOT NULL,
    CONSTRAINT fk_docente_usuario
        FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_docente_unidad
        FOREIGN KEY (idUnidadAcademica) REFERENCES unidadAcademica(idUnidadAcademica)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Secretaria Académica (Usuario que está vinculado a una facultad)
CREATE TABLE secretariaAcademica (
    idUsuario INT PRIMARY KEY,
    idFacultad INT NOT NULL,
    CONSTRAINT fk_secretaria_usuario
        FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_secretaria_facultad
        FOREIGN KEY (idFacultad) REFERENCES facultad(idFacultad)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla Evento (SIN idInstalacion y SIN capacidad)
CREATE TABLE evento(
    idEvento INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario INT NOT NULL,
    estado ENUM('registrado','enRevision','aprobado','rechazado') NOT NULL DEFAULT 'registrado',
    nombre VARCHAR(200) NOT NULL,
    tipo ENUM('ludico','academico') NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    horaFin TIME NOT NULL,
    CONSTRAINT fk_evento_usuario
        FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla Organizacion (CON nit y created_by desde el inicio)
CREATE TABLE organizacion (
    idOrganizacion INT AUTO_INCREMENT PRIMARY KEY,
    nit VARCHAR(20) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    representanteLegal VARCHAR(200) NOT NULL,
    created_by INT NOT NULL,
    ubicacion VARCHAR(200),
    direccion VARCHAR(200),
    ciudad VARCHAR(100),
    sectorEconomico VARCHAR(100),
    actividadPrincipal VARCHAR(150),
    telefono VARCHAR(20),
    CONSTRAINT fk_organizacion_creator 
        FOREIGN KEY (created_by) REFERENCES usuario(idUsuario)
);

-- Tabla Aval (Tabla asociativa vinculada con el usuario organizador y evento)
CREATE TABLE aval (
    idUsuario INT NOT NULL,
    idEvento INT NOT NULL,
    avalPdf VARCHAR(255) NOT NULL,
    principal BOOLEAN NOT NULL,
    tipoAval ENUM('director_programa', 'director_docencia') NOT NULL,
    CONSTRAINT pk_aval PRIMARY KEY (idUsuario, idEvento),
    CONSTRAINT fk_aval_usuario FOREIGN KEY (idUsuario)
        REFERENCES usuario(idUsuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_aval_evento FOREIGN KEY (idEvento)
        REFERENCES evento(idEvento)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla Asociativa (Rompimiento de evento y organizacion)
CREATE TABLE organizacion_evento (
    idOrganizacion INT NOT NULL,
    idEvento INT NOT NULL,
    certificadoParticipacion VARCHAR(255), -- Ruta url 
    participante VARCHAR(200) NOT NULL,
    esRepresentanteLegal ENUM('si','no') NOT NULL,
    CONSTRAINT pk_org_evento PRIMARY KEY (idOrganizacion, idEvento),
    CONSTRAINT fk_org_evento_organizacion FOREIGN KEY (idOrganizacion)
        REFERENCES organizacion(idOrganizacion)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_org_evento_evento FOREIGN KEY (idEvento)
        REFERENCES evento(idEvento)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla Evaluacion (Solo puede ser creada por una secretaria Academica)
CREATE TABLE evaluacion (
    idEvaluacion INT AUTO_INCREMENT PRIMARY KEY,
    estado ENUM('aprobado','rechazado') NOT NULL,
    fechaEvaluacion DATE NOT NULL,
    justificacion TEXT,
    actaAprobacion VARCHAR(255), -- ruta archivo PDF
    idEvento INT NOT NULL,
    idSecretaria INT NOT NULL,
    CONSTRAINT fk_eval_evento FOREIGN KEY (idEvento)
        REFERENCES evento(idEvento)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_eval_secretaria FOREIGN KEY (idSecretaria)
        REFERENCES secretariaAcademica(idUsuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla asociativa evento_instalacion
CREATE TABLE evento_instalacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idEvento INT NOT NULL,
    idInstalacion INT NOT NULL,
    CONSTRAINT fk_evento_inst_event 
        FOREIGN KEY (idEvento) REFERENCES evento(idEvento) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_evento_inst_inst 
        FOREIGN KEY (idInstalacion) REFERENCES instalacion(idInstalacion) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Tabla Notificacion
CREATE TABLE notificacion (
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
        ON DELETE CASCADE
);

-- ÍNDICES Y CONSTRAINTS ADICIONALES

-- índice único para prevenir duplicados evento
ALTER TABLE evento
ADD CONSTRAINT ux_evento_unique UNIQUE (nombre, fecha, hora);

-- restricción única para NIT
ALTER TABLE organizacion 
ADD CONSTRAINT uq_organizacion_nit UNIQUE (nit);

-- índices para notificacion
CREATE INDEX idx_usuario_leida ON notificacion(idUsuario, leida);
CREATE INDEX idx_evento ON notificacion(idEvento);
CREATE INDEX idx_fecha ON notificacion(fecha_creacion);

-- TRIGGERS

DELIMITER $$

-- 1) Solo estudiantes o docentes pueden crear eventos
CREATE TRIGGER trg_validar_organizador_before_insert
BEFORE INSERT ON evento
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM estudiante e WHERE e.idUsuario = NEW.idUsuario
    ) AND NOT EXISTS (
        SELECT 1 FROM docente d WHERE d.idUsuario = NEW.idUsuario
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo estudiantes o docentes pueden crear eventos.';
    END IF;
END$$

-- 2) Solo una secretaria académica puede crear una evaluación
CREATE TRIGGER trg_validar_secretaria_before_insert
BEFORE INSERT ON evaluacion
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM secretariaAcademica sa WHERE sa.idUsuario = NEW.idSecretaria
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo una Secretaria Académica puede crear una evaluación.';
    END IF;
END$$

-- 3) Evitar solapamiento de eventos en la misma instalación
CREATE TRIGGER trg_evitar_solapamiento_ei_before_insert
BEFORE INSERT ON evento_instalacion
FOR EACH ROW
BEGIN
    DECLARE evento_fecha DATE;
    DECLARE evento_hora TIME;
    DECLARE evento_hora_fin TIME;
    DECLARE instalacion_ocupada INT DEFAULT 0;
    
    -- Obtener información del evento
    SELECT e.fecha, e.hora, e.horaFin
    INTO evento_fecha, evento_hora, evento_hora_fin
    FROM evento e
    WHERE e.idEvento = NEW.idEvento;
    
    -- Verificar solapamiento
    SELECT COUNT(*) INTO instalacion_ocupada
    FROM evento_instalacion ei
    JOIN evento e ON ei.idEvento = e.idEvento
    WHERE ei.idInstalacion = NEW.idInstalacion
      AND e.fecha = evento_fecha
      AND e.estado != 'rechazado'
      AND e.idEvento != NEW.idEvento
      AND (
        (e.hora < evento_hora_fin AND e.horaFin > evento_hora)
      );
    
    IF instalacion_ocupada > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La instalación ya está ocupada en ese horario. Por favor, seleccione otra fecha, hora o instalación.';
    END IF;
END$$

-- 4) Evitar solapamiento al actualizar evento_instalacion
CREATE TRIGGER trg_evitar_solapamiento_ei_before_update
BEFORE UPDATE ON evento_instalacion
FOR EACH ROW
BEGIN
    DECLARE evento_fecha DATE;
    DECLARE evento_hora TIME;
    DECLARE evento_hora_fin TIME;
    DECLARE instalacion_ocupada INT DEFAULT 0;
    
    -- Obtener información del evento
    SELECT e.fecha, e.hora, e.horaFin
    INTO evento_fecha, evento_hora, evento_hora_fin
    FROM evento e
    WHERE e.idEvento = NEW.idEvento;
    
    -- Verificar solapamiento (excluyendo el evento actual)
    SELECT COUNT(*) INTO instalacion_ocupada
    FROM evento_instalacion ei
    JOIN evento e ON ei.idEvento = e.idEvento
    WHERE ei.idInstalacion = NEW.idInstalacion
      AND e.fecha = evento_fecha
      AND e.estado != 'rechazado'
      AND e.idEvento != NEW.idEvento
      AND (
        (e.hora < evento_hora_fin AND e.horaFin > evento_hora)
      );
    
    IF instalacion_ocupada > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La instalación ya está ocupada en ese horario.';
    END IF;
END$$

DELIMITER ;

-- DATOS DE PRUEBA

INSERT INTO facultad VALUES 
(1, "Ingeniería"), 
(2, "Ciencias"), 
(3, "Administración"), 
(4, "Humanidades");

INSERT INTO programa VALUES 
(1, "Ingeniería de Sistemas", 1), 
(2, "Ingeniería Civil", 1), 
(3, "Matemáticas", 2), 
(4, "Física", 2), 
(5, "Administración de Empresas", 3), 
(6, "Psicología", 4);

INSERT INTO unidadacademica VALUES 
(1, "Departamento de Ingeniería", 1), 
(2, "Departamento de Ciencias Exactas", 2), 
(3, "Departamento de Negocios", 3), 
(4, "Departamento de Comunicación Social", 4);

INSERT INTO instalacion VALUES 
(1, "Laboratorio de Informatica", "Labs 2", 100, "laboratorio"), 
(2, "Auditorio Yquinde", "Ala Norte", 300, "auditorio"), 
(3, "4302", "Aulas 4 Piso 3", 30, "salon");

INSERT INTO documento VALUES (1), (2), (3);

-- Verificar que todo se creó correctamente
SHOW TABLES;

-- Verificar triggers
SHOW TRIGGERS;

SELECT 'Base de datos creada exitosamente!' as Status;