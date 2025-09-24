-- Datos de prueba para autenticación
-- Contraseñas hash para: 123, admin, test

USE gestionEventos;

-- Limpiar datos existentes
DELETE FROM contraseña;
DELETE FROM estudiante; 
DELETE FROM docente;
DELETE FROM secretariaAcademica;
DELETE FROM usuario;

-- Insertar usuarios de prueba
INSERT INTO usuario (idUsuario, nombre, apellidos, email, telefono) VALUES
(1, 'Juan', 'Pérez', 'juan@test.com', '1234567890'),
(2, 'María', 'García', 'maria@test.com', '1234567891'), 
(3, 'Carlos', 'López', 'admin@test.com', '1234567892');

-- Insertar contraseñas (hash de: 123, admin, test respectivamente)
-- Hash generado con bcrypt para '123': $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- Hash generado con bcrypt para 'admin': $2a$10$yL4FZsC2yS8s.JVfS3j3FOdqGQ.lZi8j8.2/7KzK1sW6rA0xm.HLe
-- Hash generado con bcrypt para 'test': $2a$10$WE2wS.tT2j8A8H0V3VgTJ.BhJ2oZhA2uA8KvY0vE6t2oP4I0xE8Ma
INSERT INTO contraseña (idUsuario, fechaCambio, clave, estado) VALUES
(1, CURDATE(), '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'activa'),
(2, CURDATE(), '$2a$10$yL4FZsC2yS8s.JVfS3j3FOdqGQ.lZi8j8.2/7KzK1sW6rA0xm.HLe', 'activa'),
(3, CURDATE(), '$2a$10$WE2wS.tT2j8A8H0V3VgTJ.BhJ2oZhA2uA8KvY0vE6t2oP4I0xE8Ma', 'activa');

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
    CASE 
        WHEN e.idUsuario IS NOT NULL THEN 'estudiante'
        WHEN d.idUsuario IS NOT NULL THEN 'docente' 
        WHEN s.idUsuario IS NOT NULL THEN 'secretaria'
        ELSE 'usuario'
    END as tipo
FROM usuario u 
LEFT JOIN estudiante e ON u.idUsuario = e.idUsuario
LEFT JOIN docente d ON u.idUsuario = d.idUsuario  
LEFT JOIN secretariaAcademica s ON u.idUsuario = s.idUsuario
ORDER BY u.idUsuario;