let state = {
  users: [],
  organizations: [],
  events: [],
  installations: [],
  notifications: []
};

let listeners = [];

export function initState() {
  // Estado inicial vacío, sin localStorage
  state = {
    users: [],
    organizations: [],
    events: [],
    installations: [],
    notifications: []
  };
}

export function getState() {
  return { ...state };
}

export function setState(next) {
  const prev = { ...state };
  state = { ...state, ...next };
  listeners.forEach(fn => fn(state, prev));
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(f => f !== fn);
  };
}
