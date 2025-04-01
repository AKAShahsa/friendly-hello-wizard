
import { useState, useCallback, useRef, useEffect } from "react";
import { Howl } from "howler";
import { Track } from "../types/music";
import { socket, syncPlaybackToRoom, requestSync } from "@/lib/socket";
import { ref, update, get } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

export const useTrackPlayer = (roomId: string | null, userId: string, volume: number, isHost: boolean) => {
  const [sound, setSound] = useState<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  const prevTrackRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUpdatingRef = useRef(false); // Prevent update loops
  const lastSyncTimeRef = useRef(Date.now());
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Add sync request handler
  useEffect(() => {
    if (!roomId || !userId) return;
    
    const handleSyncRequest = (data: any) => {
      if (data.roomId === roomId && isHost && sound) {
        const trackPosition = sound.seek();
        const position = typeof trackPosition === 'number' ? trackPosition : 0;
        
        syncPlaybackToRoom(roomId, {
          trackId: currentTrack?.id,
          isPlaying: isPlaying,
          position: position,
          timestamp: Date.now()
        });
      }
    };
    
    const handleSyncPlayback = (data: any) => {
      if (data.roomId === roomId && !isHost && data.trackId && currentTrack?.id !== data.trackId) {
        // Need to load a different track
        const trackRef = ref(rtdb, `rooms/${roomId}/queue/${data.trackId}`);
        get(trackRef).then((snapshot) => {
          if (snapshot.exists()) {
            const track = snapshot.val() as Track;
            playTrack(track, true, data.position);
          }
        });
      } else if (data.roomId === roomId && !isHost && currentTrack?.id === data.trackId) {
        // Just need to sync time and playback state
        if (sound) {
          // Ensure we're not more than 3 seconds out of sync
          const currentPos = sound.seek() as number;
          if (Math.abs(currentPos - data.position) > 3) {
            console.log(`Seeking to ${data.position} (was at ${currentPos})`);
            sound.seek(data.position);
          }
          
          // Sync play/pause state
          if (data.isPlaying && !isPlaying) {
            sound.play();
            setIsPlaying(true);
          } else if (!data.isPlaying && isPlaying) {
            sound.pause();
            setIsPlaying(false);
          }
        }
      }
    };
    
    // Handle playback state changes from other users
    const handlePlaybackStateChanged = (data: any) => {
      if (data.roomId === roomId && !isHost) {
        if (data.state === "play" && !isPlaying && sound) {
          sound.play();
          setIsPlaying(true);
        } else if (data.state === "pause" && isPlaying && sound) {
          sound.pause();
          setIsPlaying(false);
        }
      }
    };
    
    // Handle track changes from host
    const handleTrackChanged = (data: any) => {
      if (data.roomId === roomId && !isHost && data.trackId) {
        const trackRef = ref(rtdb, `rooms/${roomId}/queue/${data.trackId}`);
        get(trackRef).then((snapshot) => {
          if (snapshot.exists()) {
            const track = snapshot.val() as Track;
            playTrack(track, true);
          }
        });
      }
    };

    socket.on("syncRequest", handleSyncRequest);
    socket.on("syncPlayback", handleSyncPlayback);
    socket.on("trackChanged", handleTrackChanged);
    socket.on("playbackStateChanged", handlePlaybackStateChanged);
    
    // Non-hosts should request a sync when joining
    if (!isHost) {
      requestSync(roomId, userId);
    }
    
    // Set up periodic sync for host
    if (isHost && !syncIntervalRef.current) {
      syncIntervalRef.current = setInterval(() => {
        if (currentTrack && sound) {
          const trackPosition = sound.seek();
          const position = typeof trackPosition === 'number' ? trackPosition : 0;
          
          syncPlaybackToRoom(roomId, {
            trackId: currentTrack.id,
            isPlaying: isPlaying,
            position: position,
            timestamp: Date.now()
          });
        }
      }, 5000); // Sync every 5 seconds
    }
    
    return () => {
      socket.off("syncRequest", handleSyncRequest);
      socket.off("syncPlayback", handleSyncPlayback);
      socket.off("trackChanged", handleTrackChanged);
      socket.off("playbackStateChanged", handlePlaybackStateChanged);
      
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [roomId, userId, isHost, sound, isPlaying, currentTrack]);

  const playTrack = useCallback((track: Track, isRemoteChange = false, startPosition = 0) => {
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
          
          if (roomId && isHost && !isUpdatingRef.current) {
            isUpdatingRef.current = true;
            const roomRef = ref(rtdb, `rooms/${roomId}`);
            update(roomRef, { currentTrack: track })
              .then(() => {
                if (!isRemoteChange) {
                  socket.emit("play", { roomId, trackId: track.id });
                  socket.emit("trackChanged", { roomId, trackId: track.id });
                  socket.emit("playbackStateChanged", { roomId, state: "play" });
                }
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
          
          if (roomId && isHost && !isRemoteChange) {
            socket.emit("pause", { roomId });
            socket.emit("playbackStateChanged", { roomId, state: "pause" });
          }
        },
        onend: () => {
          setIsPlaying(false);
        },
        onloaderror: (id, error) => {
          console.error(`Error loading audio: ${track.audioUrl}`, error);
          setIsPlaying(false);
          toast({
            title: "Error loading audio",
            description: "Could not load the audio file. Please try another track.",
            variant: "destructive"
          });
        }
      });
      
      newSound.play();
      
      // If we need to seek to a specific position
      if (startPosition > 0) {
        newSound.seek(startPosition);
      }
      
      setSound(newSound);
      setCurrentTrack(track);
      setCurrentTime(startPosition);
    } catch (error) {
      console.error("Error playing track:", error);
      toast({
        title: "Error playing track",
        description: "An error occurred while trying to play this track.",
        variant: "destructive"
      });
    }
  }, [volume, roomId, sound, isHost]);

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
    
    if (roomId && isHost) {
      socket.emit("seek", { roomId, position: time });
      
      // Also sync overall playback
      syncPlaybackToRoom(roomId, {
        trackId: currentTrack?.id,
        isPlaying: isPlaying,
        position: time,
        timestamp: Date.now()
      });
    }
  }, [sound, roomId, isHost, currentTrack, isPlaying]);

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
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
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
