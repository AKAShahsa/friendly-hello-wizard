import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { onValue, ref, update, get } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { socket, requestSync } from "@/lib/socket";
import { Track, User, Reaction, MusicContextType, ChatMessage } from "@/types/music";
import { useTrackPlayer } from "@/hooks/useTrackPlayer";
import { useRoomManagement } from "@/hooks/useRoomManagement";
import { useQueue } from "@/hooks/useQueue";
import { useCommunication } from "@/hooks/useCommunication";
import { toast } from "@/hooks/use-toast";

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
  nextTrack: () => null,
  prevTrack: () => null,
  seek: () => {},
  setVolume: () => {},
  sendChatMessage: () => {},
  sendReaction: () => {},
  addSongByUrl: async () => false,
  transferHostStatus: () => {}
};

const MusicContext = createContext<MusicContextType>(defaultContextValue);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.7);
  const [currentTrackState, setCurrentTrackState] = useState<Track | null>(null);
  const roomListenerRef = useRef<(() => void) | null>(null);
  const isUserHostRef = useRef<boolean>(false);

  const userId = localStorage.getItem("userId") || `user_${Math.random().toString(36).substring(2, 9)}`;
  
  useEffect(() => {
    localStorage.setItem("userId", userId);
  }, [userId]);

  useEffect(() => {
    const currentUser = users.find(user => user.id === userId);
    isUserHostRef.current = !!currentUser?.isHost;
  }, [users, userId]);

  const {
    currentTrack, isPlaying, currentTime, setCurrentTime,
    playTrack, togglePlayPause, seek, setVolume: setHowlerVolume, setupTimeTracking
  } = useTrackPlayer(roomId, userId, volume, isUserHostRef.current);

  const {
    queue, setQueue, addToQueue, removeFromQueue, 
    nextTrack: queueNextTrack, prevTrack: queuePrevTrack, addSongByUrl
  } = useQueue(roomId, playTrack, isUserHostRef.current);

  const {
    messages, setMessages, reactions, setReactions,
    sendChatMessage, sendReaction
  } = useCommunication(roomId, userId);

  const {
    createRoom, joinRoom, leaveRoom: leaveRoomFn, transferHostStatus
  } = useRoomManagement(
    userId, setRoomId, setUsers, setMessages, 
    setReactions, setQueue, setCurrentTrackState
  );

  const nextTrack = (): Track | null => {
    if (isUserHostRef.current) {
      return queueNextTrack(currentTrack);
    } else {
      toast({
        title: "Not allowed",
        description: "Only the host can control playback",
        variant: "destructive"
      });
      return null;
    }
  };
  
  const prevTrack = (): Track | null => {
    if (isUserHostRef.current) {
      return queuePrevTrack(currentTrack);
    } else {
      toast({
        title: "Not allowed",
        description: "Only the host can control playback",
        variant: "destructive"
      });
      return null;
    }
  };
  
  const setVolume = (newVolume: number) => {
    setHowlerVolume(newVolume);
    setVolumeState(newVolume);
  };
  
  const leaveRoom = () => leaveRoomFn();

  const handlePlayTrack = (track: Track) => {
    if (isUserHostRef.current) {
      playTrack(track);
    } else {
      toast({
        title: "Not allowed",
        description: "Only the host can control playback",
        variant: "destructive"
      });
    }
  };

  const handleTogglePlayPause = () => {
    if (isUserHostRef.current) {
      togglePlayPause();
    } else {
      toast({
        title: "Not allowed",
        description: "Only the host can control playback",
        variant: "destructive"
      });
    }
  };

  const handleSeek = (time: number) => {
    if (isUserHostRef.current) {
      seek(time);
    } else {
      toast({
        title: "Not allowed",
        description: "Only the host can control playback",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (currentTrack !== currentTrackState) {
      setCurrentTrackState(currentTrack);
    }
  }, [currentTrack, currentTrackState]);

  useEffect(() => {
    if (currentTrackState && (!currentTrack || currentTrackState.id !== currentTrack.id)) {
      if (isUserHostRef.current) {
        playTrack(currentTrackState);
      }
    }
  }, [currentTrackState, currentTrack, playTrack]);

  useEffect(() => {
    const cleanup = setupTimeTracking(setCurrentTime);
    return cleanup;
  }, [setupTimeTracking, setCurrentTime]);

  useEffect(() => {
    return () => {
      if (roomListenerRef.current) {
        roomListenerRef.current();
        roomListenerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    
    if (roomListenerRef.current) {
      roomListenerRef.current();
      roomListenerRef.current = null;
    }
    
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
          setCurrentTrackState(newTrack);
          if (!isUserHostRef.current) {
            playTrack(newTrack, true);
          }
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
              timestamp: msg.timestamp,
              isAI: msg.isAI || msg.userId === 'ai-assistant'
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
    
    roomListenerRef.current = unsubscribe;
    
    const keepActive = setInterval(() => {
      if (!roomId) return;
      
      const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
      update(userRef, {
        lastActive: Date.now(),
        isActive: true
      });
    }, 30000);
    
    return () => {
      if (roomListenerRef.current) {
        roomListenerRef.current();
        roomListenerRef.current = null;
      }
      clearInterval(keepActive);
    };
  }, [roomId, currentTrack, setQueue, playTrack, setMessages, setReactions, userId]);

  useEffect(() => {
    if (!roomId) return;

    const handlePlay = (data: any) => {
      if (data.roomId === roomId && !isPlaying && !isUserHostRef.current) {
        togglePlayPause();
      }
    };
    
    const handlePause = (data: any) => {
      if (data.roomId === roomId && isPlaying && !isUserHostRef.current) {
        togglePlayPause();
      }
    };
    
    const handleSeek = (data: any) => {
      if (data.roomId === roomId && !isUserHostRef.current) {
        seek(data.position);
      }
    };
    
    const handleNextTrack = (data: any) => {
      if (data.roomId === roomId && !isUserHostRef.current) {
        queueNextTrack(currentTrack);
      }
    };
    
    const handlePrevTrack = (data: any) => {
      if (data.roomId === roomId && !isUserHostRef.current) {
        queuePrevTrack(currentTrack);
      }
    };

    const handleNewMessage = (data: any) => {
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
              timestamp: data.message.timestamp,
              isAI: data.message.isAI || data.message.userId === 'ai-assistant'
            };
            setMessages(prev => [...prev, newMessage]);
          }
        } catch (error) {
          console.error("Error processing new message:", error);
        }
      }
    };

    const handleNewReaction = (data: any) => {
      if (data.roomId === roomId) {
        setReactions(prev => ({
          ...prev,
          [data.reactionType]: (prev[data.reactionType] || 0) + 1
        }));
      }
    };

    socket.on("play", handlePlay);
    socket.on("pause", handlePause);
    socket.on("seek", handleSeek);
    socket.on("nextTrack", handleNextTrack);
    socket.on("prevTrack", handlePrevTrack);
    socket.on("newMessage", handleNewMessage);
    socket.on("newReaction", handleNewReaction);

    return () => {
      socket.off("play", handlePlay);
      socket.off("pause", handlePause);
      socket.off("seek", handleSeek);
      socket.off("nextTrack", handleNextTrack);
      socket.off("prevTrack", handlePrevTrack);
      socket.off("newMessage", handleNewMessage);
      socket.off("newReaction", handleNewReaction);
    };
  }, [roomId, isPlaying, togglePlayPause, seek, queueNextTrack, queuePrevTrack, setMessages, currentTrack]);

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
    playTrack: handlePlayTrack,
    togglePlayPause: handleTogglePlayPause,
    nextTrack,
    prevTrack,
    seek: handleSeek,
    setVolume,
    sendChatMessage,
    sendReaction,
    addSongByUrl,
    transferHostStatus
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
