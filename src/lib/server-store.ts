// Server-side in-memory store for all app data, shared across every user.
// Data persists for the lifetime of the Node.js process.
// For durable persistence across restarts, replace with a database (e.g. Supabase).
let store: unknown = null;

export function getData(): unknown {
  return store;
}

export function setData(data: unknown): void {
  store = data;
}
