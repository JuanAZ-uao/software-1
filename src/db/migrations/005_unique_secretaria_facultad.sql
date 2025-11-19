-- Migration: Solo una secretaria académica por facultad
-- Previene que se creen dos secretarias académicas para la misma facultad

ALTER TABLE secretariaAcademica
ADD CONSTRAINT ux_secretaria_facultad UNIQUE (idFacultad);
