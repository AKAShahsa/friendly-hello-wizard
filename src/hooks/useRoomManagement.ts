
import { useState } from "react";
import { ref, set, push, update, get } from "firebase/database";
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
  const createRoom = async (name: string): Promise<string> => {
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
    
    setRoomId(newRoomId);
    
    socket.emit("joinRoom", { roomId: newRoomId, userId });
    
    return newRoomId;
  };

  const joinRoom = async (roomId: string, userName: string): Promise<boolean> => {
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
    
    await set(ref(rtdb, `rooms/${roomId}/users/${userId}`), {
      id: userId,
      name: userName,
      isActive: true,
      lastActive: Date.now(),
      isHost: false
    });
    
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
    
    return true;
  };

  const leaveRoom = (roomId: string | null) => {
    if (!roomId) return;
    
    const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
    update(userRef, {
      isActive: false,
      lastActive: Date.now()
    });
    
    socket.emit("leaveRoom", { roomId, userId });
    
    setRoomId(null);
    setUsers([]);
    setMessages([]);
    
    toast({
      title: "Left room",
      description: "You have successfully left the room"
    });
  };

  return {
    createRoom,
    joinRoom,
    leaveRoom
  };
};
