-- Datos de prueba para autenticación - CONTRASEÑAS SIMPLES
-- Usuarios con contraseñas: 123, admin, test

USE gestionEventos;

-- Limpiar datos existentes
DELETE FROM contraseña;
DELETE FROM estudiante; 
DELETE FROM docente;
DELETE FROM secretariaAcademica;
DELETE FROM usuario;

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
INSERT INTO estudiante (idUsuario, fechaIngreso) VALUES (1, CURDATE());
INSERT INTO docente (idUsuario, fechaContratacion) VALUES (2, CURDATE()); 
INSERT INTO secretariaAcademica (idUsuario, fechaAsignacion) VALUES (3, CURDATE());

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