
import { io } from "socket.io-client";

// Create socket connection
export const socket = io("https://music-sync-server.glitch.me", {
  autoConnect: true,
  reconnection: true,
  transports: ["websocket", "polling"]
});

// Configure socket events
socket.on("connect", () => {
  console.log("Socket connected with ID:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Socket disconnected");
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});
