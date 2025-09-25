// scripts/components/token.js

let recoveryContacto = '';

function goToRecovery() {
  renderRecoveryStep1();
}

function renderRecoveryStep1() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-form">
        <h1 class="auth-title">Recuperar Contraseña</h1>
        <form id="recoveryFormStep1">
          <div class="form-group">
            <label>Correo o Teléfono</label>
            <input type="text" name="contacto" required placeholder="Ingresa tu email o número de teléfono">
          </div>
          <button type="submit" class="btn primary">Enviar código</button>
        </form>
        <p class="back-login">
          <a href="#" onclick="backToLogin()">Volver al inicio de sesión</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById("recoveryFormStep1").addEventListener("submit", function (e) {
    e.preventDefault();
    const contacto = e.target.contacto.value.trim();
    if (!contacto) {
      alert("Por favor ingresa tu correo o teléfono");
      return;
    }
    recoveryContacto = contacto;
    // Aquí deberías enviar el código al backend
    renderRecoveryStep2();
  });
}

function renderRecoveryStep2() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-form">
        <h1 class="auth-title">Verifica tu código</h1>
        <form id="recoveryFormStep2">
          <div class="form-group">
            <label>Código recibido</label>
            <input type="text" name="codigo" required placeholder="Ingresa el código">
          </div>
          <button type="submit" class="btn primary">Verificar código</button>
        </form>
        <p class="back-login">
          <a href="#" onclick="backToLogin()">Volver al inicio de sesión</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById("recoveryFormStep2").addEventListener("submit", function (e) {
    e.preventDefault();
    // Aquí deberías verificar el código con el backend
    renderRecoveryStep3();
  });
}

function renderRecoveryStep3() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-form">
        <h1 class="auth-title">Nueva Contraseña</h1>
        <form id="recoveryFormStep3">
          <div class="form-group">
            <label>Nueva contraseña</label>
            <input type="password" name="password1" required placeholder="Nueva contraseña">
          </div>
          <div class="form-group">
            <label>Confirmar contraseña</label>
            <input type="password" name="password2" required placeholder="Confirma la nueva contraseña">
          </div>
          <button type="submit" class="btn primary">Cambiar contraseña</button>
        </form>
        <p class="back-login">
          <a href="#" onclick="backToLogin()">Volver al inicio de sesión</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById("recoveryFormStep3").addEventListener("submit", async function (e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pass1 = fd.get("password1");
    const pass2 = fd.get("password2");
    if (pass1 !== pass2) {
      alert("Las contraseñas no coinciden");
      return;
    }
    if (!recoveryContacto) {
      alert("No se encontró el correo o teléfono para recuperar.");
      backToLogin();
      return;
    }
    // Llamar al backend para actualizar la contraseña
    try {
      const res = await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryContacto, password: pass1 })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al cambiar contraseña');
      alert("Contraseña cambiada exitosamente. Ahora puedes iniciar sesión.");
      backToLogin();
    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}

function backToLogin() {
  window.location.reload(); // recarga y vuelve al login original
}