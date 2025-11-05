import { Server, Socket } from 'socket.io';

// In-memory map of userId -> Set of socket ids
const userSockets = new Map<string, Set<string>>();
let ioRef: Server | null = null;

export function registerSocketHandlers(io: Server) {
  ioRef = io;
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;
    if (userId) {
      const set = userSockets.get(userId) ?? new Set<string>();
      set.add(socket.id);
      userSockets.set(userId, set);
    }

    socket.on('disconnect', () => {
      if (!userId) return;
      const set = userSockets.get(userId);
      if (!set) return;
      set.delete(socket.id);
      if (set.size === 0) userSockets.delete(userId);
    });
  });
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (!ioRef) return;
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const sid of sockets) {
    ioRef.to(sid).emit(event, payload);
  }
}
