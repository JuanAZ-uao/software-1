
import { deepClone } from './helpers.js';

const mockUsers = [
  { id: '1', name: 'Ana García', email: 'estudiante@uni.edu', role: 'Estudiante', department: 'Ingeniería de Sistemas', joinDate: '2023-08-15', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b372?w=150', bio: 'Estudiante de último año apasionada por la tecnología', interests: ['Programación','IA','Desarrollo Web']},
  { id: '2', name: 'Carlos Pérez', email: 'profesor@uni.edu', role: 'Profesor', department: 'Ciencias', joinDate: '2021-03-10', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150', bio: 'Docente de investigación', interests: ['Investigación','Publicaciones']},
  { id: '3', name: 'Admin', email: 'admin@uni.edu', role: 'Administrador', department: 'TI', joinDate: '2020-01-01', avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=150', bio: 'Gestión del sistema', interests: ['Seguridad','DevOps']},
];

const mockOrganizations = [
  { id: '1', name: 'TechCorp Solutions', type: 'Empresa', description: 'Empresa líder en soluciones tecnológicas', contact: 'contacto@techcorp.com', website: 'https://techcorp.com', logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100', status: 'Activa' },
];

const mockEvents = [
  { id: '1', title: 'Conferencia de Inteligencia Artificial', description: 'Conferencia sobre los últimos avances en IA', category: 'Académicos', subcategory: 'Conferencias', date: '2025-12-15', time: '14:00', location: 'Auditorio Principal', capacity: 200, attendees: 45, organizerId: '2', organizationId: '1', status: 'Publicado' },
  { id: '2', title: 'Hackathon de Innovación', description: '48 horas de creación', category: 'Tecnológicos', subcategory: 'Hackathons', date: '2025-11-20', time: '09:00', location: 'Lab 3', capacity: 120, attendees: 30, organizerId: '1', organizationId: '', status: 'Borrador' },
  { id: '3', title: 'Simposio de Investigación', description: 'Resultados recientes', category: 'Investigación', subcategory: 'Simposios', date: '2025-10-05', time: '10:00', location: 'Sala B', capacity: 80, attendees: 55, organizerId: '2', organizationId: '', status: 'Cancelado' }
];

const mockNotifications = [
  { id:'n1', title:'Bienvenido a Universidad Connect', type:'sistema', date: Date.now(), read:false },
  { id:'n2', title:'Evento aprobado', type:'evento', date: Date.now()-86400000, read:false }
];

const initial = { users: [], organizations: [], events: [], notifications: [] };

let state = deepClone(initial);
let listeners = [];

export function initState(){
  const persisted = localStorage.getItem('uc_state');
  if (persisted) {
    state = JSON.parse(persisted);
  } else {
    state = { users: mockUsers, organizations: mockOrganizations, events: mockEvents, notifications: mockNotifications };
    localStorage.setItem('uc_state', JSON.stringify(state));
  }
}

export function getState(){ return deepClone(state); }

export function setState(next){
  const prev = state; state = deepClone(next);
  localStorage.setItem('uc_state', JSON.stringify(state));
  listeners.forEach(l => l(state, prev));
}

export function subscribe(fn){ listeners.push(fn); return () => listeners = listeners.filter(f=>f!==fn); }

export const actions = {
  addNotification: (n) => {
    const st = getState(); st.notifications.unshift({ id: 'n'+Date.now(), ...n}); setState(st);
  }
};
