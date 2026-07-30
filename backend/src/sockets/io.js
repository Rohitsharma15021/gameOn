/**
 * Holds the Socket.IO server instance so plain route handlers (which have no
 * access to the HTTP server) can still emit — e.g. message.routes.js
 * broadcasting a chat message it just persisted over REST.
 */
let io = null;

export function setIo(instance) {
  io = instance;
}

export function getIo() {
  return io;
}
