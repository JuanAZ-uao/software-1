/**
 * Controlador para obtener el usuario actual (requiere autenticación)
 * Por ahora retorna error (no implementado)
 */
export const getCurrentUser = async (req, res) => {
	// Esta función requeriría middleware de autenticación JWT
	// Por ahora retornamos error
	res.status(401).json({
		success: false,
		message: 'No autorizado'
	});
};
/**
 * auth.controller.js - Controlador de autenticación
 *
 * Este archivo define los controladores para las rutas de autenticación:
 * - Login de usuario
 * - Registro de usuario
 * - Obtener usuario actual (requiere autenticación)
 *
 * Los controladores reciben la petición HTTP, llaman a los servicios y devuelven la respuesta.
 */

import { authenticate, registerUser as registerUserService } from '../services/auth.service.js';

/**
 * Controlador para login de usuario
 * Llama al servicio authenticate y responde con los datos del usuario
 */
export const loginUser = async (req, res) => {
	const { email, password } = req.body;
	const user = await authenticate(email, password);
	res.json({
		success: true,
		message: 'Login exitoso',
		user: {
			id: user.idUsuario,
			name: `${user.nombre} ${user.apellidos}`,
			email: user.email,
			telefono: user.telefono,
			tipo: user.tipo || 'usuario'
		}
	});
};

/**
 * Controlador para registro de usuario
 * Llama al servicio registerUser y responde con los datos del nuevo usuario
 */
export const registerUser = async (req, res) => {
	const userData = req.body;
	try {
		const newUser = await registerUserService(userData);
		res.status(201).json({
			success: true,
			message: 'Usuario registrado exitosamente',
			user: {
				id: newUser.idUsuario,
				name: `${newUser.nombre} ${newUser.apellidos}`,
				email: newUser.email,
				telefono: newUser.telefono,
				tipo: newUser.tipo
			}
		});
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};