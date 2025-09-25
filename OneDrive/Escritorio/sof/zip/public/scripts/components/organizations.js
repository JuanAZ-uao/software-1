
import { getState, setState } from '../utils/state.js';
import { toast, validateURL } from '../utils/helpers.js';

export function renderOrganizations(){
  const { organizations } = getState();
  const rows = organizations.map(o=> `
    <tr>
      <td>${o.name}</td>
      <td>${o.type}</td>
      <td>${o.website ? `<a href="${o.website}" target="_blank">link</a>` : ''}</td>
      <td><span class="badge">${o.status}</span></td>
    </tr>
  `).join('');

  return `
    <div class="grid">
      <div class="card col-8 col-12">
        <div class="card-head"><strong>Organizaciones</strong><input id="orgSearch" class="input" placeholder="Buscar..." style="max-width:240px"></div>
        <div class="card-body table-wrap">
          <table class="table" id="orgTable">
            <thead><tr><th>Nombre</th><th>Tipo</th><th>Sitio</th><th>Estado</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="card col-4 col-12">
        <div class="card-head"><strong>Registrar organización</strong></div>
        <div class="card-body">
          <form id="orgForm" class="flex-col gap-12">
            <div><label class="label">Nombre</label><input class="input" name="name" required></div>
            <div><label class="label">Tipo</label>
              <select class="select" name="type" required>
                <option>ONG</option><option>Empresa</option><option>Institución Educativa</option>
                <option>Gobierno</option><option>Startup</option><option>Corporación</option>
              </select>
            </div>
            <div><label class="label">Descripción</label><textarea class="textarea" name="description"></textarea></div>
            <div><label class="label">Contacto</label><input class="input" name="contact" type="email" placeholder="contacto@org.com"></div>
            <div><label class="label">Sitio web</label><input class="input" name="website" placeholder="https://..." ></div>
            <div><label class="label">Logo (URL)</label><input class="input" name="logo" placeholder="https://..." ></div>
            <div><label class="label">Estado</label>
              <select class="select" name="status"><option>Activa</option><option>Inactiva</option><option>Pendiente</option></select>
            </div>
            <button class="btn primary">Guardar</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

document.addEventListener('submit', (e) => {
  if (e.target?.id === 'orgForm') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    if (payload.website && !validateURL(payload.website)) return toast('URL inválida','error');
    const st = getState();
    const id = (Math.max(0, ...st.organizations.map(o=>+o.id||0)) + 1).toString();
    st.organizations.unshift({ id, ...payload });
    setState(st);
    toast('Organización registrada','success');
    e.target.reset();
  }
});

document.addEventListener('input', (e) => {
  if (e.target?.id === 'orgSearch') {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#orgTable tbody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }
});
