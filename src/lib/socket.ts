import { io } from "socket.io-client";

// Create socket connection with reconnection options
export const socket = io("https://music-sync-server.glitch.me", {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ["websocket", "polling"]
});

// Keep track of rooms the socket is connected to
let currentRoomId = null;

// Configure socket events
socket.on("connect", () => {
  console.log("Socket connected with ID:", socket.id);
  
  // Rejoin room if we were in one
  if (currentRoomId) {
    const userId = localStorage.getItem("userId");
    if (userId) {
      console.log(`Rejoining room ${currentRoomId} after reconnect`);
      socket.emit("joinRoom", { roomId: currentRoomId, userId });
    }
  }
});

socket.on("disconnect", () => {
  console.log("Socket disconnected");
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});

// Override the original emit method to track room joins/leaves
const originalEmit = socket.emit;
socket.emit = function(event, ...args) {
  if (event === "joinRoom" && args[0] && args[0].roomId) {
    currentRoomId = args[0].roomId;
    console.log(`Tracked room join: ${currentRoomId}`);
  } else if (event === "leaveRoom") {
    currentRoomId = null;
    console.log("Tracked room leave");
  }
  return originalEmit.apply(this, [event, ...args]);
};

// Add handler for room events
socket.on("userLeft", (data) => {
  console.log("User left the room:", data);
});

socket.on("userJoined", (data) => {
  console.log("User joined the room:", data);
});

// Export a function to manually reconnect if needed
export const reconnectSocket = () => {
  if (!socket.connected) {
    console.log("Manually reconnecting socket...");
    socket.connect();
  }
};
