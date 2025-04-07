import { useState, useCallback, useRef, useEffect } from "react";
import { Howl } from "howler";
import { Track } from "../types/music";
import { socket, syncPlaybackToRoom, requestSync, broadcastToast } from "@/lib/socket";
import { ref, update, get, onValue } from "firebase/database";
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
  const lastSyncDataRef = useRef<any>(null);
  const syncThrottleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    const playbackStateRef = ref(rtdb, `rooms/${roomId}/playbackState`);
    const unsubscribe = onValue(playbackStateRef, (snapshot) => {
      if (!snapshot.exists() || isHost) return;
      
      const playbackData = snapshot.val();
      console.log("Received playback state from DB:", playbackData);
      
      if (!isHost && sound && currentTrack) {
        const serverTimestamp = playbackData.serverTimestamp || Date.now();
        const elapsedSinceUpdate = (Date.now() - serverTimestamp) / 1000;
        let syncPosition = playbackData.position + (playbackData.isPlaying ? elapsedSinceUpdate : 0);
        
        if (Math.abs(sound.seek() as number - syncPosition) > 1.5) {
          console.log(`Syncing position from ${sound.seek() as number} to ${syncPosition}`);
          sound.seek(syncPosition);
        }
        
        if (playbackData.isPlaying && !isPlaying) {
          sound.play();
          setIsPlaying(true);
        } else if (!playbackData.isPlaying && isPlaying) {
          sound.pause();
          setIsPlaying(false);
        }
      }
    });
    
    return () => unsubscribe();
  }, [roomId, isHost, sound, currentTrack, isPlaying]);

  useEffect(() => {
    if (!roomId || !userId) return;
    
    const handleSyncRequest = (data: any) => {
      if (data.roomId === roomId && isHost && sound) {
        const trackPosition = sound.seek();
        const position = typeof trackPosition === 'number' ? trackPosition : 0;
        
        const playbackStateRef = ref(rtdb, `rooms/${roomId}/playbackState`);
        update(playbackStateRef, {
          trackId: currentTrack?.id,
          isPlaying: isPlaying,
          position: position,
          serverTimestamp: Date.now()
        });
        
        syncPlaybackToRoom(roomId, {
          trackId: currentTrack?.id,
          isPlaying: isPlaying,
          position: position,
          timestamp: Date.now()
        });
      }
    };
    
    const handleSyncPlayback = (data: any) => {
      if (data.roomId === roomId && !isHost) {
        if (data.trackId && currentTrack?.id !== data.trackId) {
          const trackRef = ref(rtdb, `rooms/${roomId}/queue/${data.trackId}`);
          get(trackRef).then((snapshot) => {
            if (snapshot.exists()) {
              const track = snapshot.val() as Track;
              playTrack(track, true, data.position);
            }
          });
        } else if (data.trackId && currentTrack?.id === data.trackId && sound) {
          const currentPos = sound.seek() as number;
          if (Math.abs(currentPos - data.position) > 1.5) {
            console.log(`Seeking to ${data.position} (was at ${currentPos})`);
            sound.seek(data.position);
          }
          
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
    
    const handlePlaybackStateChanged = (data: any) => {
      if (data.roomId === roomId && !isHost && sound) {
        if (data.state === "play" && !isPlaying) {
          sound.play();
          setIsPlaying(true);
        } else if (data.state === "pause" && isPlaying) {
          sound.pause();
          setIsPlaying(false);
        } else if (data.state === "seek" && data.position !== undefined) {
          sound.seek(data.position);
          setCurrentTime(data.position);
        }
      }
    };
    
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
    
    if (!isHost) {
      requestSync(roomId, userId);
    }
    
    if (isHost && !syncIntervalRef.current) {
      syncIntervalRef.current = setInterval(() => {
        if (currentTrack && sound) {
          const trackPosition = sound.seek();
          const position = typeof trackPosition === 'number' ? trackPosition : 0;
          
          const playbackStateRef = ref(rtdb, `rooms/${roomId}/playbackState`);
          update(playbackStateRef, {
            trackId: currentTrack.id,
            isPlaying: isPlaying,
            position: position,
            serverTimestamp: Date.now()
          });
          
          syncPlaybackToRoom(roomId, {
            trackId: currentTrack.id,
            isPlaying: isPlaying,
            position: position,
            timestamp: Date.now()
          });
        }
      }, 3000);
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

  const playTrack = useCallback((track: Track, isRemoteChange = false, startPosition = 0): void => {
    if (!track || prevTrackRef.current === track.id) return;
    prevTrackRef.current = track.id;
    
    if (sound) {
      sound.stop();
      sound.unload();
    }
    
    try {
      const isSpotifyTrack = track.isSpotify || track.id.startsWith('spotify_');
      
      if (isSpotifyTrack && !track.audioUrl.includes('mp3')) {
        if (roomId) {
          broadcastToast(
            roomId, 
            "Spotify Track Info", 
            "Full track requires a Spotify account. Using preview if available."
          );
        } else {
          toast({
            title: "Spotify Track Info",
            description: "Full track requires a Spotify account. Using preview if available."
          });
        }
      }
      
      const newSound = new Howl({
        src: [track.audioUrl],
        html5: true,
        volume: volume,
        onplay: () => {
          setIsPlaying(true);
          
          if (roomId && isHost && !isUpdatingRef.current) {
            isUpdatingRef.current = true;
            
            const roomRef = ref(rtdb, `rooms/${roomId}`);
            const playbackStateRef = ref(rtdb, `rooms/${roomId}/playbackState`);
            
            Promise.all([
              update(roomRef, { currentTrack: track }),
              update(playbackStateRef, {
                trackId: track.id,
                isPlaying: true,
                position: startPosition,
                serverTimestamp: Date.now()
              })
            ])
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
          
          if (roomId && isHost && !isRemoteChange && !isUpdatingRef.current) {
            isUpdatingRef.current = true;
            
            const playbackStateRef = ref(rtdb, `rooms/${roomId}/playbackState`);
            update(playbackStateRef, {
              isPlaying: false,
              position: newSound.seek() as number,
              serverTimestamp: Date.now()
            })
            .then(() => {
              socket.emit("pause", { roomId });
              socket.emit("playbackStateChanged", { roomId, state: "pause" });
            })
            .catch(error => {
              console.error("Error updating playback state on pause:", error);
            })
            .finally(() => {
              isUpdatingRef.current = false;
            });
          }
        },
        onend: () => {
          setIsPlaying(false);
        },
        onloaderror: (id, error) => {
          console.error(`Error loading audio: ${track.audioUrl}`, error);
          setIsPlaying(false);
          
          if (isSpotifyTrack) {
            toast({
              title: "Spotify Playback Error",
              description: "This track may require Spotify Premium or isn't available for preview.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Error loading audio",
              description: "Could not load the audio file. Please try another track.",
              variant: "destructive"
            });
          }
        }
      });
      
      newSound.play();
      
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
    
    if (roomId && isHost && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      
      const playbackStateRef = ref(rtdb, `rooms/${roomId}/playbackState`);
      update(playbackStateRef, {
        position: time,
        serverTimestamp: Date.now()
      })
      .then(() => {
        socket.emit("seek", { roomId, position: time });
        socket.emit("playbackStateChanged", { roomId, state: "seek", position: time });
        
        syncPlaybackToRoom(roomId, {
          trackId: currentTrack?.id,
          isPlaying: isPlaying,
          position: time,
          timestamp: Date.now()
        });
      })
      .catch(error => {
        console.error("Error updating seek time:", error);
      })
      .finally(() => {
        isUpdatingRef.current = false;
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
      if (syncThrottleTimeoutRef.current) {
        clearTimeout(syncThrottleTimeoutRef.current);
        syncThrottleTimeoutRef.current = null;
      }
    };
  }, [sound]);

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
