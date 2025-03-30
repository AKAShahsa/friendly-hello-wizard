
import { useState, useCallback, useRef, useEffect } from "react";
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
  
  const prevTrackRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUpdatingRef = useRef(false); // Prevent update loops

  const playTrack = useCallback((track: Track) => {
    if (!track || prevTrackRef.current === track.id) return;
    prevTrackRef.current = track.id;
    
    // Stop and unload previous sound
    if (sound) {
      sound.stop();
      sound.unload();
    }
    
    try {
      const newSound = new Howl({
        src: [track.audioUrl],
        html5: true,
        volume: volume,
        onplay: () => {
          setIsPlaying(true);
          
          if (roomId && !isUpdatingRef.current) {
            isUpdatingRef.current = true;
            const roomRef = ref(rtdb, `rooms/${roomId}`);
            update(roomRef, { currentTrack: track })
              .then(() => {
                socket.emit("play", { roomId, trackId: track.id });
              })
              .catch(error => {
                console.error("Error updating room on play:", error);
              })
              .finally(() => {
                isUpdatingRef.current = false;
              });
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
        },
        onloaderror: (id, error) => {
          console.error(`Error loading audio: ${track.audioUrl}`, error);
          setIsPlaying(false);
        }
      });
      
      newSound.play();
      setSound(newSound);
      setCurrentTrack(track);
      setCurrentTime(0);
    } catch (error) {
      console.error("Error playing track:", error);
    }
  }, [volume, roomId, sound]);

  const togglePlayPause = useCallback(() => {
    if (!sound) return;
    
    if (isPlaying) {
      sound.pause();
    } else {
      sound.play();
    }
  }, [sound, isPlaying]);

  const seek = useCallback((time: number) => {
    if (!sound) return;
    
    sound.seek(time);
    setCurrentTime(time);
    
    if (roomId) {
      socket.emit("seek", { roomId, position: time });
    }
  }, [sound, roomId]);

  const setVolume = useCallback((newVolume: number) => {
    if (sound) {
      sound.volume(newVolume);
    }
  }, [sound]);

  const setupTimeTracking = useCallback((setCurrentTimeCallback: (time: number) => void) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (!sound || !isPlaying) return () => {};
    
    timerRef.current = setInterval(() => {
      try {
        if (!sound) return;
        
        const time = sound.seek();
        const timeValue = typeof time === 'number' ? time : 0;
        setCurrentTimeCallback(timeValue);
        
        if (roomId && !isUpdatingRef.current) {
          isUpdatingRef.current = true;
          const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
          update(userRef, {
            currentTime: timeValue,
            lastActive: Date.now()
          })
            .catch(error => {
              console.error("Error updating time in Firebase:", error);
            })
            .finally(() => {
              isUpdatingRef.current = false;
            });
        }
      } catch (error) {
        console.error("Error in time tracking:", error);
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sound, isPlaying, roomId, userId]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (sound) {
        sound.stop();
        sound.unload();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sound]);

  // Update volume when volume prop changes
  useEffect(() => {
    setVolume(volume);
  }, [volume, setVolume]);

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
