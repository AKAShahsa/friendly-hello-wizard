import React, { createContext, useContext, useState, useEffect } from "react";
import { onValue, ref, update, get } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { socket } from "@/lib/socket";
import { Track, User, Reaction, MusicContextType, ChatMessage } from "@/types/music";
import { defaultTracks } from "@/utils/musicDefaults";
import { useTrackPlayer } from "@/hooks/useTrackPlayer";
import { useRoomManagement } from "@/hooks/useRoomManagement";
import { useQueue } from "@/hooks/useQueue";
import { useCommunication } from "@/hooks/useCommunication";

// Create a default context value to prevent "undefined" errors
const defaultContextValue: MusicContextType = {
  currentTrack: null,
  queue: [],
  isPlaying: false,
  currentTime: 0,
  volume: 0.7,
  users: [],
  roomId: null,
  reactions: { thumbsUp: 0, heart: 0, smile: 0 },
  messages: [],
  createRoom: async () => "",
  joinRoom: async () => false,
  leaveRoom: () => {},
  addToQueue: () => {},
  removeFromQueue: () => {},
  playTrack: () => {},
  togglePlayPause: () => {},
  nextTrack: () => {},
  prevTrack: () => {},
  seek: () => {},
  setVolume: () => {},
  sendChatMessage: () => {},
  sendReaction: () => {},
  addSongByUrl: async () => false
};

const MusicContext = createContext<MusicContextType>(defaultContextValue);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.7);

  const userId = localStorage.getItem("userId") || `user_${Math.random().toString(36).substring(2, 9)}`;
  
  useEffect(() => {
    localStorage.setItem("userId", userId);
  }, [userId]);

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
    setReactions, setQueue, setCurrentTrack
  );

  const nextTrack = () => queueNextTrack(currentTrack);
  const prevTrack = () => queuePrevTrack(currentTrack);
  const setVolume = (newVolume: number) => {
    setHowlerVolume(newVolume);
    setVolumeState(newVolume);
  };
  const leaveRoom = () => leaveRoomFn();

  useEffect(() => {
    const cleanup = setupTimeTracking(setCurrentTime);
    return cleanup;
  }, [setupTimeTracking, setCurrentTime]);

  useEffect(() => {
    if (!roomId) return;
    
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val();
      if (!roomData) return;
      
      if (roomData.queue) {
        const queueTracks = Object.values(roomData.queue) as Track[];
        setQueue(queueTracks);
      }
      
      if (roomData.currentTrack) {
        const newTrack = roomData.currentTrack as Track;
        if (!currentTrack || currentTrack.id !== newTrack.id) {
          playTrack(newTrack);
        }
      }
      
      if (roomData.users) {
        const usersList = Object.values(roomData.users) as User[];
        setUsers(usersList);
        
        const currentTime = Date.now();
        usersList.forEach(user => {
          if (user.id !== userId && user.isActive && (currentTime - user.lastActive > 60000)) {
            const userRef = ref(rtdb, `rooms/${roomId}/users/${user.id}`);
            update(userRef, { isActive: false });
          }
        });
        
        const currentUserRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
        get(currentUserRef).then(snapshot => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            if (!userData.isActive) {
              update(currentUserRef, { 
                isActive: true, 
                lastActive: Date.now() 
              });
            }
          }
        });
      }
      
      if (roomData.messages) {
        try {
          const messagesList = Object.values(roomData.messages)
            .filter((msg: any) => {
              return msg && 
                typeof msg.userId === 'string' && 
                typeof msg.userName === 'string' && 
                typeof msg.text === 'string' && 
                typeof msg.timestamp === 'number';
            })
            .map((msg: any) => ({
              userId: msg.userId,
              userName: msg.userName,
              text: msg.text,
              timestamp: msg.timestamp
            })) as ChatMessage[];
          
          setMessages(messagesList);
        } catch (error) {
          console.error("Error processing messages:", error);
        }
      }

      if (roomData.reactions) {
        try {
          const reactionsData = roomData.reactions as Reaction;
          setReactions(reactionsData);
        } catch (error) {
          console.error("Error processing reactions:", error);
        }
      }
    });
    
    const keepActive = setInterval(() => {
      if (!roomId) return;
      
      const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
      update(userRef, {
        lastActive: Date.now(),
        isActive: true
      });
    }, 30000);
    
    return () => {
      unsubscribe();
      clearInterval(keepActive);
    };
  }, [roomId, currentTrack, setQueue, playTrack, setMessages, setReactions, userId]);

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
      if (data.roomId === roomId && data.message) {
        try {
          if (
            typeof data.message.userId === 'string' && 
            typeof data.message.userName === 'string' && 
            typeof data.message.text === 'string' && 
            typeof data.message.timestamp === 'number'
          ) {
            const newMessage: ChatMessage = {
              userId: data.message.userId,
              userName: data.message.userName,
              text: data.message.text,
              timestamp: data.message.timestamp
            };
            setMessages(prev => [...prev, newMessage]);
          }
        } catch (error) {
          console.error("Error processing new message:", error);
        }
      }
    });

    socket.on("newReaction", (data) => {
      if (data.roomId === roomId) {
        setReactions(prev => ({
          ...prev,
          [data.reactionType]: (prev[data.reactionType] || 0) + 1
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

  const contextValue: MusicContextType = {
    currentTrack,
    queue,
    isPlaying,
    currentTime,
    volume,
    users,
    roomId,
    reactions,
    messages: messages || [],
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
    addSongByUrl
  };

  return (
    <MusicContext.Provider value={contextValue}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};
