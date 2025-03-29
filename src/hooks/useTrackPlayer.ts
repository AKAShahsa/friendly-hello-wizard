
import { useState, useCallback } from "react";
import { Howl } from "howler";
import { Track } from "../types/music";
import { socket } from "@/lib/socket";
import { ref, update } from "firebase/database";
import { rtdb } from "@/lib/firebase";

export const useTrackPlayer = (roomId: string | null, userId: string, volume: number) => {
  const [sound, setSound] = useState<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

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
  };

  // Setup for time tracking
  const setupTimeTracking = (setCurrentTimeCallback: (time: number) => void) => {
    if (!sound || !isPlaying) return () => {};
    
    const timer = setInterval(() => {
      const time = sound.seek();
      const timeValue = typeof time === 'number' ? time : 0;
      setCurrentTimeCallback(timeValue);
      
      if (roomId) {
        const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
        update(userRef, {
          currentTime: timeValue,
          lastActive: Date.now()
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  };

  return {
    sound,
    isPlaying,
    currentTrack,
    currentTime,
    setCurrentTime,
    playTrack,
    togglePlayPause,
    seek,
    setVolume,
    setupTimeTracking
  };
};
