-- Datos de prueba para autenticación - CONTRASEÑAS SIMPLES
-- Usuarios con contraseñas: 123, admin, test

USE gestionEventos;

-- Limpiar datos existentes
DELETE FROM contraseña;
DELETE FROM estudiante; 
DELETE FROM docente;
DELETE FROM secretariaAcademica;
DELETE FROM usuario;
DELETE FROM programa;
DELETE FROM programa;
DELETE FROM unidadAcademica;
DELETE FROM facultad;

-- Insertar facultades de prueba
INSERT INTO facultad (nombre) VALUES
('Facultad de Ingeniería'),
('Facultad de Ciencias Económicas y Administrativas'),
('Facultad de Ciencias Básicas');

-- Insertar unidades académicas de prueba
INSERT INTO unidadAcademica (nombre, idFacultad) VALUES
('Departamento de Sistemas', 1),
('Departamento de Industrial', 1),
('Departamento de Administración', 2),
('Departamento de Matemáticas', 3);

-- Insertar programas de prueba
INSERT INTO programa (nombre, idFacultad) VALUES
('Ingeniería de Sistemas', 1),
('Ingeniería Industrial', 1),
('Administración de Empresas', 2),
('Matemáticas', 3);

-- Insertar usuarios de prueba (sin especificar idUsuario para que use AUTO_INCREMENT)
INSERT INTO usuario (nombre, apellidos, email, telefono) VALUES
('Juan', 'Pérez', 'juan@test.com', '1234567890'),
('María', 'García', 'maria@test.com', '1234567891'), 
('Carlos', 'López', 'admin@test.com', '1234567892');

-- Insertar contraseñas simples (usando los IDs autogenerados)
INSERT INTO contraseña (idUsuario, fechaCambio, clave, estado) VALUES
(1, CURDATE(), '123', 'activa'),
(2, CURDATE(), 'admin', 'activa'),
(3, CURDATE(), 'test', 'activa');

-- Asignar tipos de usuario
INSERT INTO estudiante (idUsuario, idPrograma) VALUES (1, 1);
INSERT INTO docente (idUsuario, idUnidadAcademica) VALUES (2, 1); 
INSERT INTO secretariaAcademica (idUsuario, idFacultad) VALUES (3, 1);

-- Verificar datos insertados
SELECT 
    u.idUsuario,
    u.nombre,
    u.apellidos,
    u.email,
    u.telefono,
    c.clave as password_simple,
    CASE 
        WHEN e.idUsuario IS NOT NULL THEN 'estudiante'
        WHEN d.idUsuario IS NOT NULL THEN 'docente' 
        WHEN s.idUsuario IS NOT NULL THEN 'secretaria'
        ELSE 'usuario'
    END as tipo
FROM usuario u 
LEFT JOIN contraseña c ON u.idUsuario = c.idUsuario AND c.estado = 'activa'
LEFT JOIN estudiante e ON u.idUsuario = e.idUsuario
LEFT JOIN docente d ON u.idUsuario = d.idUsuario  
LEFT JOIN secretariaAcademica s ON u.idUsuario = s.idUsuario
ORDER BY u.idUsuario;