/**
 * user.controller.js - Controlador de usuarios
 *
 * Define los controladores para las rutas de usuarios:
 * - Listar usuarios
 * - Obtener usuario por ID
 * - Crear usuario
 * - Actualizar usuario
 * - Eliminar usuario
 *
 * Los controladores reciben la petición HTTP, llaman a los servicios y devuelven la respuesta.
 */

import * as usersService from '../services/user.service.js';
import pool from '../db/pool.js';
import bcrypt from 'bcryptjs';
import { updateUserPassword } from '../repositories/auth.repository.js';

/**
 * Controlador para listar todos los usuarios
 */
export const listUsers = async (_req, res) => {
    const users = await usersService.getUsers();
    res.json({ data: users });
};

/**
 * Controlador para obtener un usuario por ID
 */
export const getUser = async (req, res) => {
    const user = await usersService.getUserById(req.params.id);
    res.json({ data: user });
};

/**
 * Controlador para crear un nuevo usuario
 */
export const createUser = async (req, res) => {
    const user = await usersService.createUser(req.body);
    res.status(201).json({ data: user });
};

/**
 * Controlador para actualizar un usuario existente
 */
export const updateUser = async (req, res) => {
    const user = await usersService.updateUser(req.params.id, req.body);
    res.json({ data: user });
};

/**
 * Controlador para eliminar un usuario
 */
export const deleteUser = async (req, res) => {
    await usersService.removeUser(req.params.id);
    res.status(204).send();
};

/**
 * Controlador para actualizar perfil del usuario actual
 */
export const updateProfile = async (req, res) => {
    const { idUsuario, nombre, apellidos, telefono } = req.body;
    
    if (!idUsuario || !nombre || !apellidos || !telefono) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son requeridos'
        });
    }

    try {
        await pool.execute(
            'UPDATE usuario SET nombre = ?, apellidos = ?, telefono = ? WHERE idUsuario = ?',
            [nombre, apellidos, telefono, idUsuario]
        );

        // Obtener usuario actualizado
        const [rows] = await pool.execute(
            'SELECT * FROM usuario WHERE idUsuario = ?',
            [idUsuario]
        );

        const updatedUser = rows[0];

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente',
            user: {
                id: updatedUser.idUsuario,
                name: `${updatedUser.nombre} ${updatedUser.apellidos}`,
                email: updatedUser.email,
                telefono: updatedUser.telefono,
                nombre: updatedUser.nombre,
                apellidos: updatedUser.apellidos
            }
        });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando perfil'
        });
    }
};

/**
 * Controlador para cambiar contraseña del usuario actual
 */
export const changePassword = async (req, res) => {
    const { idUsuario, currentPassword, newPassword } = req.body;
    
    if (!idUsuario || !currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son requeridos'
        });
    }

    // Validar nueva contraseña con los nuevos requisitos
    if (!isValidPassword(newPassword)) {
        return res.status(400).json({
            success: false,
            message: 'La nueva contraseña debe tener al menos 6 caracteres, una mayúscula y un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?")'
        });
    }

    try {
        // Verificar contraseña actual usando bcrypt
        const [rows] = await pool.execute(
            'SELECT clave FROM contraseña WHERE idUsuario = ? AND estado = "activa"',
            [idUsuario]
        );

        if (!rows[0]) {
            return res.status(400).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Comparar contraseña actual con el hash almacenado
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, rows[0].clave);
        if (!isValidCurrentPassword) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña actual es incorrecta'
            });
        }

        // Actualizar contraseña usando la función del repositorio (que encripta automáticamente)
        await updateUserPassword(idUsuario, newPassword);

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error cambiando contraseña'
        });
    }
};

/**
 * Función auxiliar para validar contraseña con los nuevos requisitos de seguridad
 */
function isValidPassword(password) {
    if (!password || password.length < 6) {
        return false;
    }
    
    // Verificar que tenga al menos una mayúscula
    const hasUpperCase = /[A-Z]/.test(password);
    
    // Verificar que tenga al menos un carácter especial
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?"]/.test(password);
    
    return hasUpperCase && hasSpecialChar;
}