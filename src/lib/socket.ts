
import { io } from "socket.io-client";

// Create socket connection
export const socket = io("https://music-sync-server.glitch.me", {
  autoConnect: true,
  reconnection: true,
  transports: ["websocket", "polling"]
});
