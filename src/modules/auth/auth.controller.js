// src/modules/auth/auth.controller.js
import { authenticate, registerUser as registerUserService } from './auth.service.js';

// Login
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

// Registro
export const registerUser = async (req, res) => {
  console.log('🔵 Registro - Datos recibidos:', req.body);
  
  const userData = req.body;
  
  try {
    const newUser = await registerUserService(userData);
    
    console.log('✅ Usuario registrado exitosamente:', newUser);
    
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
    console.error('❌ Error en registro:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al registrar usuario'
    });
  }
};

// Obtener usuario actual (para verificar sesión)
export const getCurrentUser = async (req, res) => {
  // Esta función requeriría middleware de autenticación JWT
  // Por ahora retornamos error
  res.status(401).json({
    success: false,
    message: 'No autorizado'
  });
};