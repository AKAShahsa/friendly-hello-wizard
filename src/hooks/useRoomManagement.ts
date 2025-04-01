
import { useState } from "react";
import { ref, set, push, update, get, onDisconnect } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { socket } from "@/lib/socket";
import { User, Track, Reaction } from "@/types/music";
import { defaultTracks, defaultReactions } from "@/utils/musicDefaults";

export const useRoomManagement = (
  userId: string, 
  setRoomId: (id: string | null) => void,
  setUsers: (users: User[]) => void,
  setMessages: (messages: any[]) => void,
  setReactions: (reactions: Reaction) => void,
  setQueue: (queue: Track[]) => void,
  setCurrentTrack: (track: Track | null) => void
) => {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const createRoom = async (name: string): Promise<string> => {
    try {
      const newRoomRef = push(ref(rtdb, 'rooms'));
      const newRoomId = newRoomRef.key as string;
      
      await set(newRoomRef, {
        name,
        createdAt: Date.now(),
        createdBy: userId,
        queue: defaultTracks,
        users: {
          [userId]: {
            id: userId,
            name: name,
            isActive: true,
            lastActive: Date.now(),
            isHost: true
          }
        },
        reactions: defaultReactions
      });
      
      const userStatusRef = ref(rtdb, `rooms/${newRoomId}/users/${userId}`);
      onDisconnect(userStatusRef).update({
        isActive: false,
        lastActive: Date.now()
      });
      
      setCurrentRoomId(newRoomId);
      setRoomId(newRoomId);
      
      socket.emit("joinRoom", { roomId: newRoomId, userId });
      
      toast({
        title: "Room created",
        description: "You have successfully created a new room"
      });
      
      return newRoomId;
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive"
      });
      return "";
    }
  };

  const joinRoom = async (roomId: string, userName: string): Promise<boolean> => {
    try {
      if (currentRoomId && currentRoomId !== roomId) {
        await leaveRoomInternal(currentRoomId, false);
      }
      
      const roomRef = ref(rtdb, `rooms/${roomId}`);
      const snapshot = await get(roomRef);
      
      if (!snapshot.exists()) {
        toast({
          title: "Room not found",
          description: "The room you're trying to join doesn't exist.",
          variant: "destructive"
        });
        return false;
      }
      
      const roomData = snapshot.val();
      
      const isExistingUser = roomData.users && roomData.users[userId];
      const isHost = isExistingUser && roomData.users[userId].isHost === true;
      
      const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
      await set(userRef, {
        id: userId,
        name: userName,
        isActive: true,
        lastActive: Date.now(),
        isHost: isHost || (roomData.createdBy === userId)
      });
      
      onDisconnect(userRef).update({
        isActive: false,
        lastActive: Date.now()
      });
      
      setCurrentRoomId(roomId);
      setRoomId(roomId);
      
      if (roomData.queue) {
        setQueue(Object.values(roomData.queue));
      }
      
      if (roomData.currentTrack) {
        setCurrentTrack(roomData.currentTrack);
      }
      
      if (roomData.messages) {
        setMessages(Object.values(roomData.messages));
      }

      if (roomData.reactions) {
        setReactions(roomData.reactions);
      }
      
      socket.emit("joinRoom", { roomId, userId });
      
      toast({
        title: "Room joined",
        description: "You have successfully joined the room"
      });
      
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      });
      return false;
    }
  };

  const leaveRoomInternal = async (roomId: string, showToast: boolean = true) => {
    if (!roomId) return;
    
    try {
      const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
      await update(userRef, {
        isActive: false,
        lastActive: Date.now()
      });
      
      socket.emit("leaveRoom", { roomId, userId });
      
      if (currentRoomId === roomId) {
        setCurrentRoomId(null);
      }
      
      if (showToast) {
        toast({
          title: "Left room",
          description: "You have successfully left the room"
        });
      }
    } catch (error) {
      console.error("Error leaving room:", error);
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to leave room",
          variant: "destructive"
        });
      }
    }
  };

  const leaveRoom = () => {
    if (!currentRoomId) return;
    
    const roomIdToLeave = currentRoomId;
    
    setRoomId(null);
    setUsers([]);
    setMessages([]);
    setReactions(defaultReactions);
    setQueue([]);
    setCurrentTrack(null);
    
    leaveRoomInternal(roomIdToLeave);
  };

  return {
    createRoom,
    joinRoom,
    leaveRoom
  };
};
