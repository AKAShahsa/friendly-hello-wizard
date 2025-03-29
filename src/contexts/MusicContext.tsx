import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Howl } from "howler";
import { toast } from "@/hooks/use-toast";
import { db, rtdb } from "@/lib/firebase";
import { ref, onValue, set, push, update, get, increment } from "firebase/database";
import { useParams } from "react-router-dom";
import { socket } from "@/lib/socket";

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
}

interface User {
  id: string;
  name: string;
  isActive: boolean;
  lastActive: number;
  isHost?: boolean;
}

interface Reaction {
  thumbsUp: number;
  heart: number;
  smile: number;
}

interface MusicContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  users: User[];
  roomId: string | null;
  reactions: Reaction;
  createRoom: (name: string) => Promise<string>;
  joinRoom: (roomId: string, userName: string) => Promise<boolean>;
  leaveRoom: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  sendChatMessage: (message: string) => void;
  sendReaction: (reactionType: keyof Reaction) => void;
  addSongByUrl: (url: string, title?: string, artist?: string) => Promise<boolean>;
  messages: { userId: string, userName: string, text: string, timestamp: number }[];
}

const defaultTracks: Track[] = [
  {
    id: "1",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/4/4d/Queen_A_Night_At_The_Opera.png",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 355
  },
  {
    id: "2",
    title: "Imagine",
    artist: "John Lennon",
    album: "Imagine",
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/2/21/Imagine_John_Lennon.jpg/220px-Imagine_John_Lennon.jpg",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 183
  },
  {
    id: "3",
    title: "Billie Jean",
    artist: "Michael Jackson",
    album: "Thriller",
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/5/55/Michael_Jackson_-_Thriller.png",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 294
  }
];

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sound, setSound] = useState<Howl | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>(defaultTracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [users, setUsers] = useState<User[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ userId: string, userName: string, text: string, timestamp: number }>>([]);
  const [reactions, setReactions] = useState<Reaction>({ thumbsUp: 0, heart: 0, smile: 0 });

  const userId = localStorage.getItem("userId") || `user_${Math.random().toString(36).substring(2, 9)}`;
  
  useEffect(() => {
    localStorage.setItem("userId", userId);
  }, [userId]);

  useEffect(() => {
    if (!sound || !isPlaying) return;
    
    const timer = setInterval(() => {
      const time = sound.seek();
      setCurrentTime(typeof time === 'number' ? time : 0);
      
      if (roomId) {
        const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
        update(userRef, {
          currentTime: typeof time === 'number' ? time : 0,
          lastActive: Date.now()
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [sound, isPlaying, roomId, userId]);

  useEffect(() => {
    if (!roomId) return;

    socket.on("play", (data) => {
      if (data.roomId === roomId && !isPlaying) {
        sound?.play();
        setIsPlaying(true);
      }
    });
    
    socket.on("pause", (data) => {
      if (data.roomId === roomId && isPlaying) {
        sound?.pause();
        setIsPlaying(false);
      }
    });
    
    socket.on("seek", (data) => {
      if (data.roomId === roomId) {
        sound?.seek(data.position);
        setCurrentTime(data.position);
      }
    });
    
    socket.on("nextTrack", (data) => {
      if (data.roomId === roomId) {
        const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
        if (currentIndex < queue.length - 1) {
          playTrack(queue[currentIndex + 1]);
        }
      }
    });
    
    socket.on("prevTrack", (data) => {
      if (data.roomId === roomId) {
        const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
        if (currentIndex > 0) {
          playTrack(queue[currentIndex - 1]);
        }
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
  }, [roomId, sound, isPlaying, queue, currentTrack]);

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
  }, [roomId, currentTrack]);

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
      reactions: {
        thumbsUp: 0,
        heart: 0,
        smile: 0
      }
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

  const leaveRoom = () => {
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

  const addSongByUrl = async (url: string, title?: string, artist?: string): Promise<boolean> => {
    if (!url || !url.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid audio URL",
        variant: "destructive"
      });
      return false;
    }

    const suggestedTitle = title || url.split('/').pop()?.split('.')[0] || "Unknown Track";
    const trackArtist = artist || "Unknown Artist";

    const newTrack: Track = {
      id: `track_${Date.now()}`,
      title: suggestedTitle,
      artist: trackArtist,
      album: "Added via URL",
      coverUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ca/CD-ROM.png",
      audioUrl: url,
      duration: 180
    };

    addToQueue(newTrack);
    
    toast({
      title: "Song added",
      description: `Added "${suggestedTitle}" to the queue`
    });

    return true;
  };

  const sendReaction = (reactionType: keyof Reaction) => {
    if (!roomId) return;

    const reactionRef = ref(rtdb, `rooms/${roomId}/reactions/${reactionType}`);
    update(reactionRef, increment(1));

    socket.emit("newReaction", { roomId, reactionType, userId });
  };

  const playTrack = useCallback((track: Track) => {
    if (sound) {
      sound.stop();
    }
    
    const newSound = new Howl({
      src: [track.audioUrl],
      html5: true,
      volume: volume,
      onplay: () => {
        setIsPlaying(true);
        
        if (roomId) {
          const roomRef = ref(rtdb, `rooms/${roomId}`);
          update(roomRef, { currentTrack: track });
          
          socket.emit("play", { roomId, trackId: track.id });
        }
      },
      onpause: () => {
        setIsPlaying(false);
        
        if (roomId) {
          socket.emit("pause", { roomId });
        }
      },
      onend: () => {
        setIsPlaying(false);
        nextTrack();
      }
    });
    
    newSound.play();
    setSound(newSound);
    setCurrentTrack(track);
    setCurrentTime(0);
  }, [volume, roomId, sound]);

  const togglePlayPause = () => {
    if (!sound) return;
    
    if (isPlaying) {
      sound.pause();
    } else {
      sound.play();
    }
  };

  const nextTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    
    const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
    if (currentIndex < queue.length - 1) {
      playTrack(queue[currentIndex + 1]);
      
      if (roomId) {
        socket.emit("nextTrack", { roomId });
      }
    }
  };

  const prevTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    
    const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(queue[currentIndex - 1]);
      
      if (roomId) {
        socket.emit("prevTrack", { roomId });
      }
    }
  };

  const seek = (time: number) => {
    if (!sound) return;
    
    sound.seek(time);
    setCurrentTime(time);
    
    if (roomId) {
      socket.emit("seek", { roomId, position: time });
    }
  };

  const setVolume = (newVolume: number) => {
    if (sound) {
      sound.volume(newVolume);
    }
    setVolumeState(newVolume);
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
    
    if (roomId) {
      const queueRef = ref(rtdb, `rooms/${roomId}/queue`);
      update(queueRef, { [track.id]: track });
    }
    
    toast({
      title: "Added to queue",
      description: `${track.title} by ${track.artist} added to queue`
    });
  };

  const removeFromQueue = (trackId: string) => {
    setQueue(prev => prev.filter(track => track.id !== trackId));
    
    if (roomId) {
      const trackRef = ref(rtdb, `rooms/${roomId}/queue/${trackId}`);
      set(trackRef, null);
    }
  };

  const sendChatMessage = (text: string) => {
    if (!roomId || !text.trim()) return;
    
    const userName = users.find(user => user.id === userId)?.name || "Anonymous";
    
    const message = {
      userId,
      userName,
      text,
      timestamp: Date.now()
    };
    
    const messagesRef = ref(rtdb, `rooms/${roomId}/messages`);
    push(messagesRef, message);
    
    socket.emit("newMessage", { roomId, message });
  };

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
