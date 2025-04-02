
import { io } from "socket.io-client";
import { toast } from '@/hooks/use-toast';

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
let isConnecting = false;
let lastSyncTime = Date.now();
const SYNC_THROTTLE = 300; // Throttle syncs to once per 300ms

// Configure socket events
socket.on("connect", () => {
  console.log("Socket connected with ID:", socket.id);
  isConnecting = false;
  
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
    // Prevent emitting duplicate join events
    if (currentRoomId === args[0].roomId && socket.connected) {
      console.log(`Already in room ${currentRoomId}, not emitting duplicate join`);
      return this;
    }
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
  toast({
    title: "User left",
    description: `${data.userName || 'A user'} has left the room`,
  });
});

socket.on("userJoined", (data) => {
  console.log("User joined the room:", data);
  toast({
    title: "User joined",
    description: `${data.userName || 'A user'} has joined the room`,
  });
});

socket.on("hostTransferred", (data) => {
  console.log("Host status transferred:", data);
  toast({
    title: "Host transferred",
    description: `Host privileges have been transferred to ${data.newHostName || 'another user'}`,
  });
});

socket.on("syncRequest", (data) => {
  console.log("Received sync request from host", data);
});

socket.on("syncPlayback", (data) => {
  console.log("Received playback sync from host:", data);
});

// Playback sync events
socket.on("trackChanged", (data) => {
  console.log("Track changed by host:", data);
});

socket.on("playbackStateChanged", (data) => {
  console.log("Playback state changed:", data);
});

// Reaction events with improved handling
socket.on("reactionEffect", (data) => {
  console.log("Reaction effect received:", data);
  if (data.userId && data.userName && data.reactionType) {
    // Only show toast for reactions from other users
    if (data.userId !== localStorage.getItem("userId")) {
      toast({
        title: "Reaction",
        description: `${data.userName} reacted with ${data.reactionType}`,
      });
    }
  }
});

// Message reaction events
socket.on("messageReaction", (data) => {
  console.log("Message reaction received:", data);
  if (data.userId !== localStorage.getItem("userId")) {
    toast({
      title: "Message Reaction",
      description: `${data.userName} reacted to a message with ${data.emoji}`,
      duration: 3000
    });
  }
});

// Export a function to manually reconnect if needed
export const reconnectSocket = () => {
  if (!socket.connected && !isConnecting) {
    console.log("Manually reconnecting socket...");
    isConnecting = true;
    socket.connect();
  }
};

// Send playback state to others with throttling
export const syncPlaybackToRoom = (roomId, data) => {
  if (!roomId) return;
  
  // Throttle sync requests to avoid overwhelming the server
  const now = Date.now();
  if (now - lastSyncTime > SYNC_THROTTLE) {
    lastSyncTime = now;
    socket.emit("syncPlayback", { roomId, ...data });
  }
};

// Request sync from host
export const requestSync = (roomId, userId) => {
  if (!roomId) return;
  socket.emit("syncRequest", { roomId, userId });
};

// Broadcast reaction effect to all users in room
export const broadcastReaction = (roomId, reactionType, userId, userName) => {
  if (!roomId) return;
  socket.emit("reactionEffect", { 
    roomId, 
    reactionType, 
    userId, 
    userName,
    timestamp: Date.now() 
  });
};

// Get current room ID
export const getCurrentRoomId = () => currentRoomId;

// Clear room ID
export const clearRoomId = () => {
  currentRoomId = null;
};
