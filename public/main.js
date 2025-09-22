document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = "usuarios_v1";
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const formFields = document.getElementById('form-fields');
  const submitBtn = document.getElementById('submit-btn');
  const forgotLink = document.getElementById('forgot-link');
  let mode = 'login'; 

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function saveUsers(users) { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); }

  function renderLoginFields(prefillEmail = "") {
    mode = 'login';
    formFields.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="email">Correo Electrónico</label>
        <input class="form-input" type="email" id="email" name="email" value="${prefillEmail}" placeholder="usuario@universidad.edu" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="password">Contraseña</label>
        <input class="form-input" type="password" id="password" name="password" placeholder="Contraseña" required>
      </div>
    `;
    submitBtn.textContent = 'Iniciar Sesión';
    forgotLink.style.display = 'block';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  }

  function renderRegisterFields() {
    mode = 'register';
    formFields.innerHTML = `
      <div class="small-row">
        <div class="form-group" style="flex:1">
          <label class="form-label" for="nombre">Nombre</label>
          <input class="form-input" type="text" id="nombre" name="nombre" placeholder="Nombre" required>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" for="apellidos">Apellidos</label>
          <input class="form-input" type="text" id="apellidos" name="apellidos" placeholder="Apellidos" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="telefono">Teléfono</label>
        <input class="form-input" type="tel" id="telefono" name="telefono" placeholder="Teléfono" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="facultad">Facultad</label>
        <input class="form-input" type="text" id="facultad" name="facultad" placeholder="Facultad" required>
      </div>      
      <div class="form-group">
        <label class="form-label" for="email">Correo Electrónico</label>
        <input class="form-input" type="email" id="email" name="email" placeholder="usuario@universidad.edu" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="password">Contraseña</label>
        <input class="form-input" type="password" id="password" name="password" placeholder="Contraseña" required>
      </div>
    `;
    submitBtn.textContent = 'Registrarse';
    forgotLink.style.display = 'none';
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  }

  loginTab.addEventListener('click', () => renderLoginFields());
  registerTab.addEventListener('click', () => renderRegisterFields());

  renderLoginFields();

  document.getElementById('main-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));

    if (mode === 'register') {
      const users = loadUsers();
      const email = (data.email || "").toLowerCase();
      if (users.some(u => u.email === email)) {
        alert("El correo ya está registrado.");
        return;
      }
      const newUser = {
        nombre: data.nombre,
        apellidos: data.apellidos,
        telefono: data.telefono,
        email,
        password: data.password
      };
      users.push(newUser);
      saveUsers(users);
      alert("Registro exitoso. Ya puedes iniciar sesión.");
      renderLoginFields(email);
    } else {
      const users = loadUsers();
      const email = (data.email || "").toLowerCase();
      const user = users.find(u => u.email === email && u.password === data.password);
      if (user) {
        document.querySelector('.login-container').innerHTML = `
          <div style="text-align:center; padding:24px;">
            <h2>Bienvenido ${user.nombre} ${user.apellidos}</h2>
            <p>Email: ${user.email}</p>
            <p>Teléfono: ${user.telefono}</p>
            <button id="logoutBtn" class="login-btn" style="margin-top:12px;">Cerrar sesión</button>
          </div>
        `;
        document.getElementById('logoutBtn').addEventListener('click', () => location.reload());
      } else {
        alert("Credenciales incorrectas.");
      }
    }
  });
});
