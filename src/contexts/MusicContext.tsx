
import React, { createContext, useContext, useState, useEffect } from "react";
import { onValue, ref, update } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { socket } from "@/lib/socket";
import { Track, User, Reaction, MusicContextType } from "@/types/music";
import { defaultTracks } from "@/utils/musicDefaults";
import { useTrackPlayer } from "@/hooks/useTrackPlayer";
import { useRoomManagement } from "@/hooks/useRoomManagement";
import { useQueue } from "@/hooks/useQueue";
import { useCommunication } from "@/hooks/useCommunication";

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.7);

  const userId = localStorage.getItem("userId") || `user_${Math.random().toString(36).substring(2, 9)}`;
  
  useEffect(() => {
    localStorage.setItem("userId", userId);
  }, [userId]);

  // Initialize our custom hooks
  const {
    currentTrack, isPlaying, currentTime, setCurrentTime,
    playTrack, togglePlayPause, seek, setVolume: setHowlerVolume, setupTimeTracking
  } = useTrackPlayer(roomId, userId, volume);

  const {
    queue, setQueue, addToQueue, removeFromQueue, 
    nextTrack: queueNextTrack, prevTrack: queuePrevTrack, addSongByUrl
  } = useQueue(roomId, playTrack);

  const {
    messages, setMessages, reactions, setReactions,
    sendChatMessage, sendReaction
  } = useCommunication(roomId, userId);

  const {
    createRoom, joinRoom, leaveRoom: leaveRoomFn
  } = useRoomManagement(
    userId, setRoomId, setUsers, setMessages, 
    setReactions, setQueue, (track) => track ? playTrack(track) : null
  );

  // Wrapper functions
  const nextTrack = () => queueNextTrack(currentTrack);
  const prevTrack = () => queuePrevTrack(currentTrack);
  const setVolume = (newVolume: number) => {
    setHowlerVolume(newVolume);
    setVolumeState(newVolume);
  };
  const leaveRoom = () => leaveRoomFn(roomId);

  // Time tracking effect
  useEffect(() => {
    const cleanup = setupTimeTracking(setCurrentTime);
    return cleanup;
  }, [setupTimeTracking, setCurrentTime]);

  // Room data effect
  useEffect(() => {
    if (!roomId) return;
    
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val();
      if (!roomData) return;
      
      if (roomData.queue) {
        setQueue(Object.values(roomData.queue));
      }
      
      if (roomData.currentTrack) {
        const newTrack = roomData.currentTrack;
        if (!currentTrack || currentTrack.id !== newTrack.id) {
          playTrack(newTrack);
        }
      }
      
      if (roomData.users) {
        const usersList: User[] = Object.values(roomData.users);
        
        const activeUsers = usersList.filter(user => {
          const isActive = Date.now() - user.lastActive < 60000;
          if (!isActive && user.isActive) {
            const userRef = ref(rtdb, `rooms/${roomId}/users/${user.id}`);
            update(userRef, { isActive: false });
          }
          return true;
        });
        
        setUsers(activeUsers);
      }
      
      if (roomData.messages) {
        setMessages(Object.values(roomData.messages));
      }

      if (roomData.reactions) {
        setReactions(roomData.reactions);
      }
    });
    
    return () => unsubscribe();
  }, [roomId, currentTrack, setQueue, playTrack, setMessages, setReactions]);

  // Socket event handlers
  useEffect(() => {
    if (!roomId) return;

    socket.on("play", (data) => {
      if (data.roomId === roomId && !isPlaying) {
        togglePlayPause();
      }
    });
    
    socket.on("pause", (data) => {
      if (data.roomId === roomId && isPlaying) {
        togglePlayPause();
      }
    });
    
    socket.on("seek", (data) => {
      if (data.roomId === roomId) {
        seek(data.position);
      }
    });
    
    socket.on("nextTrack", (data) => {
      if (data.roomId === roomId) {
        nextTrack();
      }
    });
    
    socket.on("prevTrack", (data) => {
      if (data.roomId === roomId) {
        prevTrack();
      }
    });

    socket.on("newMessage", (data) => {
      if (data.roomId === roomId) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    socket.on("newReaction", (data) => {
      if (data.roomId === roomId) {
        setReactions(prev => ({
          ...prev,
          [data.reactionType]: prev[data.reactionType] + 1
        }));
      }
    });

    return () => {
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("nextTrack");
      socket.off("prevTrack");
      socket.off("newMessage");
      socket.off("newReaction");
    };
  }, [roomId, isPlaying, togglePlayPause, seek, nextTrack, prevTrack, setMessages]);

  return (
    <MusicContext.Provider value={{
      currentTrack,
      queue,
      isPlaying,
      currentTime,
      volume,
      users,
      roomId,
      reactions,
      createRoom,
      joinRoom,
      leaveRoom,
      addToQueue,
      removeFromQueue,
      playTrack,
      togglePlayPause,
      nextTrack,
      prevTrack,
      seek,
      setVolume,
      sendChatMessage,
      sendReaction,
      addSongByUrl,
      messages
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};
