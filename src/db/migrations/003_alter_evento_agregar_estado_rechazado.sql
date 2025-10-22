-- Migración: Agregar 'rechazado' al ENUM de estado en tabla evento
-- Fecha: 2025-10-21
-- Descripción: Permitir que los eventos puedan ser rechazados por las secretarias académicas

USE gestioneventos;

-- Modificar la columna estado para incluir 'rechazado'
ALTER TABLE evento 
MODIFY COLUMN estado ENUM('registrado','enRevision','aprobado','rechazado') NOT NULL DEFAULT 'registrado';
