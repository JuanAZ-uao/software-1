import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

/**
 * Middleware para verificar autenticación JWT
 * Valida el token en el header Authorization
 */
export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token no proporcionado',
        success: false 
      });
    }

    const token = authHeader.slice(7); // Remover "Bearer "
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Adjuntar usuario al request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ 
      error: 'Token inválido',
      success: false 
    });
  }
};

export default requireAuth;
