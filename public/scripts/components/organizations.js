import { getState, setState } from '../utils/state.js';
import { toast, qs } from '../utils/helpers.js';
import { navigateTo } from '../utils/router.js';

export async function renderOrganizations() {
  let { organizations } = getState();

  if (!Array.isArray(organizations) || organizations.length === 0) {
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.warn('Expected array from /api/organizations, got:', data);
        organizations = [];
      } else {
        organizations = data;
      }
      setState({ ...getState(), organizations });
    } catch (err) {
      console.error('Error cargando organizaciones:', err);
      organizations = [];
    }
  }

  if (!Array.isArray(organizations)) organizations = [];

  const rows = organizations.map(o => `
    <tr data-id="${o.idOrganizacion || o.id || ''}">
      <td>${escapeHtml(o.nombre || '')}</td>
      <td>${escapeHtml(o.representanteLegal || '')}</td>
      <td>${escapeHtml(o.ubicacion || '')}</td>
      <td>${escapeHtml(o.direccion || '')}</td>
      <td>${escapeHtml(o.ciudad || '')}</td>
      <td>${escapeHtml(o.sectorEconomico || '')}</td>
      <td>${escapeHtml(o.actividadPrincipal || '')}</td>
      <td>${escapeHtml(o.telefono || '')}</td>
      <td style="width:90px">
        <button class="btn tiny edit-org" title="Editar">✎</button>
        <button class="btn tiny danger delete-org" title="Eliminar">🗑</button>
      </td>
    </tr>
  `).join('');

  const tableBody = rows.length ? rows : '<tr><td colspan="9">No hay organizaciones registradas</td></tr>';

  const html = `
    <div class="grid">
      <div class="card col-8 col-12">
        <div class="card-head">
          <strong>Organizaciones</strong>
          <input id="orgSearch" class="input" placeholder="Buscar..." style="max-width:240px">
        </div>
        <div class="card-body table-wrap">
          <table class="table" id="orgTable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Representante Legal</th>
                <th>Ubicación</th>
                <th>Dirección</th>
                <th>Ciudad</th>
                <th>Sector Económico</th>
                <th>Actividad Principal</th>
                <th>Teléfono</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>${tableBody}</tbody>
          </table>
        </div>
      </div>

      <div class="card col-4 col-12">
        <div class="card-head"><strong>Registrar organización</strong></div>
        <div class="card-body">
          <form id="orgForm" class="flex-col gap-12" autocomplete="off">
            <div><label class="label">Nombre</label><input class="input" name="nombre" required></div>
            <div><label class="label">Representante Legal</label><input class="input" name="representanteLegal" required></div>
            <div><label class="label">Ubicación</label><input class="input" name="ubicacion"></div>
            <div><label class="label">Dirección</label><input class="input" name="direccion"></div>
            <div><label class="label">Ciudad</label><input class="input" name="ciudad"></div>
            <div><label class="label">Sector Económico</label><input class="input" name="sectorEconomico"></div>
            <div><label class="label">Actividad Principal</label><input class="input" name="actividadPrincipal"></div>
            <div><label class="label">Teléfono</label><input class="input" name="telefono"></div>
            <button type="submit" class="btn primary">Guardar</button>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal genérico (usa el #modal que ya existe en app shell) -->
  `;
  setTimeout(() => {
    attachHandlers();
  }, 0);

  return html;
}

/* ---------- handlers ---------- */

function attachHandlers() {
  const form = document.getElementById('orgForm');
  if (form) {
    form.removeEventListener('submit', onSubmit);
    form.addEventListener('submit', onSubmit);
  }

  const search = document.getElementById('orgSearch');
  if (search) {
    search.removeEventListener('input', onSearch);
    search.addEventListener('input', onSearch);
  }

  // Botones de Acción en la Tabla
  document.querySelectorAll('#orgTable .edit-org').forEach(btn => {
    btn.removeEventListener('click', onEditClick);
    btn.addEventListener('click', onEditClick);
  });
  document.querySelectorAll('#orgTable .delete-org').forEach(btn => {
    btn.removeEventListener('click', onDeleteClick);
    btn.addEventListener('click', onDeleteClick);
  });
}

async function onSubmit(e) {
  e.preventDefault();
  e.stopPropagation();
  const form = e.currentTarget;
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  if (!payload.nombre || !payload.representanteLegal) {
    toast('Nombre y representante legal son requeridos', 'error');
    return;
  }

  try {
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) {
      toast('Sesión expirada. Redirigiendo al login', 'error');
      navigateTo('login');
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      toast(data.error || data.message || 'Error al guardar organización', 'error');
      return;
    }

    const newOrg = (data && typeof data === 'object') ? data : payload;
    const st = getState();
    const orgs = Array.isArray(st.organizations) ? st.organizations.slice() : [];
    orgs.unshift(newOrg);
    setState({ ...st, organizations: orgs });

    // update table DOM
    const tbody = document.querySelector('#orgTable tbody');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.dataset.id = newOrg.idOrganizacion || newOrg.id || '';
      tr.innerHTML = `
        <td>${escapeHtml(newOrg.nombre || '')}</td>
        <td>${escapeHtml(newOrg.representanteLegal || '')}</td>
        <td>${escapeHtml(newOrg.ubicacion || '')}</td>
        <td>${escapeHtml(newOrg.direccion || '')}</td>
        <td>${escapeHtml(newOrg.ciudad || '')}</td>
        <td>${escapeHtml(newOrg.sectorEconomico || '')}</td>
        <td>${escapeHtml(newOrg.actividadPrincipal || '')}</td>
        <td>${escapeHtml(newOrg.telefono || '')}</td>
        <td style="width:90px">
          <button class="btn tiny edit-org" title="Editar">✎</button>
          <button class="btn tiny danger delete-org" title="Eliminar">🗑</button>
        </td>
      `;
      if (tbody.children.length === 1 && tbody.children[0].children.length === 1) tbody.innerHTML = '';
      tbody.prepend(tr);
      attachHandlers(); // rebind new buttons
    }

    toast('Organización registrada', 'success');
    form.reset();
  } catch (err) {
    console.error('Error guardando organización:', err);
    toast('Error al guardar organización', 'error');
  }
}

/* ---------- edit flow ---------- */

function onEditClick(e) {
  const tr = e.currentTarget.closest('tr');
  const id = tr?.dataset?.id;
  if (!id) return toast('Id de organización no encontrado', 'error');
  openEditModal(id);
}

function openEditModal(id) {
  const st = getState();
  const org = (Array.isArray(st.organizations) ? st.organizations.find(x => String(x.idOrganizacion || x.id) === String(id)) : null);
  if (!org) return toast('Organización no encontrada en el estado', 'error');

  // populate form HTML
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.innerText = 'Editar organización';
  modalBody.innerHTML = `
    <form id="editOrgForm" class="flex-col gap-12" autocomplete="off">
      <input type="hidden" name="id" value="${escapeHtml(id)}">
      <div><label class="label">Nombre</label><input class="input" name="nombre" value="${escapeHtml(org.nombre || '')}" required></div>
      <div><label class="label">Representante Legal</label><input class="input" name="representanteLegal" value="${escapeHtml(org.representanteLegal || '')}" required></div>
      <div><label class="label">Ubicación</label><input class="input" name="ubicacion" value="${escapeHtml(org.ubicacion || '')}"></div>
      <div><label class="label">Dirección</label><input class="input" name="direccion" value="${escapeHtml(org.direccion || '')}"></div>
      <div><label class="label">Ciudad</label><input class="input" name="ciudad" value="${escapeHtml(org.ciudad || '')}"></div>
      <div><label class="label">Sector Económico</label><input class="input" name="sectorEconomico" value="${escapeHtml(org.sectorEconomico || '')}"></div>
      <div><label class="label">Actividad Principal</label><input class="input" name="actividadPrincipal" value="${escapeHtml(org.actividadPrincipal || '')}"></div>
      <div><label class="label">Teléfono</label><input class="input" name="telefono" value="${escapeHtml(org.telefono || '')}"></div>
      <div class="flex-row" style="gap:8px; margin-top:8px;">
        <button type="submit" class="btn primary">Guardar cambios</button>
        <button type="button" id="modal-cancel" class="btn">Cancelar</button>
      </div>
    </form>
  `;
  modal.classList.add('open');

  // attach edit form handler
  const editForm = document.getElementById('editOrgForm');
  editForm.removeEventListener('submit', onEditSubmit);
  editForm.addEventListener('submit', onEditSubmit);

  const cancelBtn = document.getElementById('modal-cancel');
  cancelBtn.removeEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
}

async function onEditSubmit(e) {
  e.preventDefault();
  e.stopPropagation();
  const fd = new FormData(e.currentTarget);
  const payload = Object.fromEntries(fd.entries());
  const id = payload.id;
  delete payload.id;

  if (!payload.nombre || !payload.representanteLegal) {
    toast('Nombre y representante legal son requeridos', 'error');
    return;
  }

  try {
    const res = await fetch('/api/organizations/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) {
      toast('Sesión expirada. Redirigiendo al login', 'error');
      navigateTo('login');
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      toast(data.error || data.message || 'Error actualizando organización', 'error');
      return;
    }

    // Actualizar Estado y DOM 
    const st = getState();
    const orgs = Array.isArray(st.organizations) ? st.organizations.slice() : [];
    const idx = orgs.findIndex(x => String(x.idOrganizacion || x.id) === String(id));
    if (idx !== -1) {
      orgs[idx] = { ...(orgs[idx] || {}), ...data };
      setState({ ...st, organizations: orgs });

      // Actualizar filas de la tabla
      const tr = document.querySelector(`#orgTable tbody tr[data-id="${id}"]`);
      if (tr) {
        tr.children[0].innerText = data.nombre || '';
        tr.children[1].innerText = data.representanteLegal || '';
        tr.children[2].innerText = data.ubicacion || '';
        tr.children[3].innerText = data.direccion || '';
        tr.children[4].innerText = data.ciudad || '';
        tr.children[5].innerText = data.sectorEconomico || '';
        tr.children[6].innerText = data.actividadPrincipal || '';
        tr.children[7].innerText = data.telefono || '';
      }
    }

    toast('Organización actualizada', 'success');
    closeModal();
  } catch (err) {
    console.error('Error actualizando organización:', err);
    toast('Error actualizando organización', 'error');
  }
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('open');
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = '';
  const modalTitle = document.getElementById('modal-title');
  modalTitle.innerText = '';
}

/* ---------- delete flow ---------- */

function onDeleteClick(e) {
  const tr = e.currentTarget.closest('tr');
  const id = tr?.dataset?.id;
  if (!id) return toast('Id de organización no encontrado', 'error');

  // Confirm using native confirm or modal
  const ok = confirm('Eliminar organización? Esta acción es irreversible.');
  if (!ok) return;

  doDelete(id);
}

async function doDelete(id) {
  try {
    const res = await fetch('/api/organizations/' + id, { method: 'DELETE' });

    if (res.status === 401 || res.status === 403) {
      toast('Sesión expirada. Redirigiendo al login', 'error');
      navigateTo('login');
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      toast(data.error || data.message || 'Error eliminando organización', 'error');
      return;
    }

    // Update state and DOM
    const st = getState();
    const orgs = Array.isArray(st.organizations) ? st.organizations.filter(x => String(x.idOrganizacion || x.id) !== String(id)) : [];
    setState({ ...st, organizations: orgs });

    const tr = document.querySelector(`#orgTable tbody tr[data-id="${id}"]`);
    if (tr) tr.remove();

    // if table empty, show fallback row
    const tbody = document.querySelector('#orgTable tbody');
    if (tbody && tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9">No hay organizaciones registradas</td></tr>';
    }

    toast('Organización eliminada', 'success');
  } catch (err) {
    console.error('Error eliminando organización:', err);
    toast('Error eliminando organización', 'error');
  }
}

/* ---------- search & helpers ---------- */

function onSearch(e) {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#orgTable tbody tr').forEach(tr => {
    // skip placeholder row
    if (!tr.dataset.id) {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      return;
    }
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
