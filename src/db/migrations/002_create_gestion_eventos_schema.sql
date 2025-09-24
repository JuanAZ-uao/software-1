-- CREAR BASE DE DATOS

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

-- Tabla Usuario (superclase)
CREATE TABLE usuario (
    idUsuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL
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

-- (CREADA ANTES DE EVENTO POR DEPENDENCIA)
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

-- Tabla Evento (esta vinculada a un usuario)
CREATE TABLE evento(
    idEvento INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario INT NOT NULL,
    idInstalacion INT NOT NULL,
    estado ENUM('registrado','enRevision','aprobado') NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    tipo ENUM('ludico','academico') NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    horaFin TIME NOT NULL,
     CONSTRAINT fk_evento_usuario
        FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT, 
    CONSTRAINT fk_evento_instalacion
        FOREIGN KEY (idInstalacion) REFERENCES instalacion(idInstalacion)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
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

-- Tabla Organizacion
CREATE TABLE organizacion (
    idOrganizacion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    representanteLegal VARCHAR(200) NOT NULL,
    ubicacion VARCHAR(200),
    direccion VARCHAR(200),
    ciudad VARCHAR(100),
    sectorEconomico VARCHAR(100),
    actividadPrincipal VARCHAR(150),
    telefono VARCHAR(20)
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

-- TRIGGERS
--   1) validar que el organizador de un evento sea estudiante o docente
--   2) validar que solo una secretariaAcademica pueda crear una evaluacion

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

-- 2) Solo una secretaria académica puede ser registrada como autor de una evaluación
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

DELIMITER ;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar usuarios de prueba en la tabla usuario
INSERT INTO usuario (idUsuario, nombre, apellidos, email, telefono) VALUES
(1, 'Ana', 'García', 'estudiante@uni.edu', '1234567890'),
(2, 'Carlos', 'Pérez', 'profesor@uni.edu', '1234567891'),
(3, 'Admin', 'Sistema', 'admin@uni.edu', '1234567892');

-- Insertar contraseñas (hash de '123456')
INSERT INTO contraseña (idUsuario, fechaCambio, clave, estado) VALUES
(1, CURDATE(), '$2b$10$hashedPassword123456', 'activa'),
(2, CURDATE(), '$2b$10$hashedPassword123456', 'activa'),
(3, CURDATE(), '$2b$10$hashedPassword123456', 'activa');
