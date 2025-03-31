
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
      
      // Check if user is already in the room
      const isExistingUser = roomData.users && roomData.users[userId];
      // Preserve host status if user is rejoining
      const isHost = isExistingUser && roomData.users[userId].isHost === true;
      
      // Always set user as active when joining
      await set(ref(rtdb, `rooms/${roomId}/users/${userId}`), {
        id: userId,
        name: userName,
        isActive: true,
        lastActive: Date.now(),
        isHost: isHost || (roomData.createdBy === userId) // Make sure creator is always host
      });
      
      // Update the room ID in the local state
      setRoomId(roomId);
      
      // Update all the other data
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
      
      // Join the socket room
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

  const leaveRoom = (roomId: string | null) => {
    if (!roomId) return;
    
    try {
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
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  return {
    createRoom,
    joinRoom,
    leaveRoom
  };
};
