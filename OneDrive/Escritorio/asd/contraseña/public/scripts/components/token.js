/**
 * Genera un token seguro aleatorio para recuperación de contraseña.
 * @param {number} length Longitud del token (por defecto 32)
 * @returns {string} Token seguro en base64url
 */
export function generateResetToken(length = 5) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  // base64url encode
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
