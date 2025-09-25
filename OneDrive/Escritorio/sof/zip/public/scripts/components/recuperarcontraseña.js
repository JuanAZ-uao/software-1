document.getElementById("recoveryForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;

  if (!email) {
    alert("Por favor ingresa tu correo o teléfono.");
    return;
  }

  // Aquí simulas el envío del código
  alert(`Código enviado a: ${email}`);

  // Redirigir a confirmación de código
  window.location.href = "confirmar-codigo.html";
});
