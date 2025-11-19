-- Migración: Agregar campo capacidad a la tabla evento
-- Fecha: 2025-11-18

USE gestionEventos;

ALTER TABLE evento
ADD COLUMN capacidad INT NULL AFTER horaFin;