import { Server } from "socket.io";

let _io: Server | null = null;

export function initSocket(io: Server) {
  _io = io;
}

export function getIO(): Server {
  if (!_io) throw new Error("Socket.io not initialised");
  return _io;
}
