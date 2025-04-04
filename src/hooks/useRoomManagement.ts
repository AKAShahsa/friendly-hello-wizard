
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
  const [joiningRoom, setJoiningRoom] = useState(false);

  const createRoom = async (name: string): Promise<string> => {
    try {
      if (currentRoomId) {
        await leaveRoomInternal(currentRoomId, false);
      }
      
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
    // Prevent duplicate join attempts
    if (joiningRoom) {
      console.log("Join already in progress, ignoring duplicate request");
      return false;
    }
    
    if (currentRoomId === roomId) {
      console.log("Already in this room, no need to rejoin");
      return true;
    }
    
    try {
      setJoiningRoom(true);
      
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
        setJoiningRoom(false);
        return false;
      }
      
      const roomData = snapshot.val();
      
      // Check if this user already exists in the room
      const isExistingUser = roomData.users && roomData.users[userId];
      const isHost = isExistingUser && roomData.users[userId].isHost === true;
      
      // Update or add the user to the room without replacing other users
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
      
      // Process room data
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
      
      // Process users data - transform object to array
      if (roomData.users) {
        const usersArray = Object.values(roomData.users) as User[];
        setUsers(usersArray);
      }
      
      socket.emit("joinRoom", { roomId, userId, userName });
      
      toast({
        title: "Room joined",
        description: "You have successfully joined the room"
      });
      
      setJoiningRoom(false);
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      });
      setJoiningRoom(false);
      return false;
    }
  };

  const leaveRoomInternal = async (roomId: string, showToast: boolean = true) => {
    if (!roomId) return;
    
    try {
      const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
      
      // Just update the active status, don't remove the user
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

  // Function to transfer host status
  const transferHostStatus = async (newHostId: string) => {
    if (!currentRoomId) return;
    
    try {
      // Get current user to check if they're the host
      const currentUserRef = ref(rtdb, `rooms/${currentRoomId}/users/${userId}`);
      const currentUserSnapshot = await get(currentUserRef);
      
      if (!currentUserSnapshot.exists() || !currentUserSnapshot.val().isHost) {
        toast({
          title: "Permission denied",
          description: "Only the host can transfer host status",
          variant: "destructive"
        });
        return;
      }
      
      // Get target user to check if they exist in the room
      const targetUserRef = ref(rtdb, `rooms/${currentRoomId}/users/${newHostId}`);
      const targetUserSnapshot = await get(targetUserRef);
      
      if (!targetUserSnapshot.exists()) {
        toast({
          title: "Error",
          description: "User not found in the room",
          variant: "destructive"
        });
        return;
      }
      
      // Remove host status from current user
      await update(currentUserRef, { isHost: false });
      
      // Add host status to new host
      await update(targetUserRef, { isHost: true });
      
      // Emit socket event to notify others
      socket.emit("hostTransferred", { 
        roomId: currentRoomId, 
        newHostId, 
        previousHostId: userId,
        newHostName: targetUserSnapshot.val().name 
      });
      
      toast({
        title: "Host status transferred",
        description: `${targetUserSnapshot.val().name} is now the host`
      });
    } catch (error) {
      console.error("Error transferring host status:", error);
      toast({
        title: "Error",
        description: "Failed to transfer host status",
        variant: "destructive"
      });
    }
  };

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    transferHostStatus
  };
};
