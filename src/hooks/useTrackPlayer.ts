
import { useState, useCallback, useRef, useEffect } from "react";
import { Howl } from "howler";
import { Track } from "../types/music";
import { socket, syncPlaybackToRoom, requestSync, broadcastToast } from "@/lib/socket";
import { ref, update, get, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { useYouTubeMusic } from "@/hooks/useYouTubeMusic";

export const useTrackPlayer = (roomId: string | null, userId: string, volume: number, isHost: boolean) => {
  const [sound, setSound] = useState<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  const { 
    playYouTubeVideo, 
    pauseVideo: pauseYouTubeVideo,
    resumeVideo: resumeYouTubeVideo,
    seekTo: seekYouTubeVideo,
    stopVideo: stopYouTubeVideo,
    getCurrentTime: getYouTubeCurrentTime,
    setVolume: setYouTubeVolume,
    playerState
  } = useYouTubeMusic();
  
  const prevTrackRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUpdatingRef = useRef(false);
  const lastSyncTimeRef = useRef(Date.now());
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncDataRef = useRef<any>(null);
  const syncThrottleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isYouTubeTrackRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    
    const playbackStateRef = ref(rtdb, `rooms/${roomId}/playbackState`);
    const unsubscribe = onValue(playbackStateRef, (snapshot) => {
      if (!snapshot.exists() || isHost) return;
      
      const playbackData = snapshot.val();
      console.log("Received playback state from DB:", playbackData);
      
      if (!isHost && currentTrack) {
        const serverTimestamp = playbackData.serverTimestamp || Date.now();
        const elapsedSinceUpdate = (Date.now() - serverTimestamp) / 1000;
        let syncPosition = playbackData.position + (playbackData.isPlaying ? elapsedSinceUpdate : 0);
        
        if (isYouTubeTrackRef.current) {
          if (Math.abs(getYouTubeCurrentTime() - syncPosition) > 1.5) {
            console.log(`Syncing YouTube position to ${syncPosition}`);
            seekYouTubeVideo(syncPosition);
          }
          
          if (playbackData.isPlaying && !isPlaying) {
            resumeYouTubeVideo();
            setIsPlaying(true);
          } else if (!playbackData.isPlaying && isPlaying) {
            pauseYouTubeVideo();
            setIsPlaying(false);
          }
        } else if (sound) {
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
      }
    });
    
    return () => unsubscribe();
  }, [roomId, isHost, sound, currentTrack, isPlaying, pauseYouTubeVideo, resumeYouTubeVideo, getYouTubeCurrentTime, seekYouTubeVideo]);

  useEffect(() => {
    if (!isYouTubeTrackRef.current || !isPlaying) return;
    
    const youtubeTimeTracker = setInterval(() => {
      const currentVideoTime = getYouTubeCurrentTime();
      if (typeof currentVideoTime === 'number') {
        setCurrentTime(currentVideoTime);
        
        if (roomId && !isUpdatingRef.current) {
          isUpdatingRef.current = true;
          const userRef = ref(rtdb, `rooms/${roomId}/users/${userId}`);
          update(userRef, {
            currentTime: currentVideoTime || 0,
            lastActive: Date.now()
          })
            .catch(error => {
              console.error("Error updating time in Firebase:", error);
            })
            .finally(() => {
              isUpdatingRef.current = false;
            });
        }
      }
    }, 1000);
    
    return () => clearInterval(youtubeTimeTracker);
  }, [isPlaying, roomId, userId, getYouTubeCurrentTime]);

  const playTrack = useCallback((track: Track, isRemoteChange = false, startPosition = 0): void => {
    if (!track || prevTrackRef.current === track.id) return;
    prevTrackRef.current = track.id;
    
    const isYouTubeTrack = Boolean(track.isYouTubeMusic || track.youtubeId);
    isYouTubeTrackRef.current = isYouTubeTrack;
    
    if (sound) {
      sound.stop();
      sound.unload();
      setSound(null);
    }
    
    if (playerState.isPlaying) {
      stopYouTubeVideo();
    }
    
    try {
      if (isYouTubeTrack && track.youtubeId) {
        console.log("Playing YouTube track:", track.title, "Video ID:", track.youtubeId);
        
        setCurrentTrack(track);
        
        const success = playYouTubeVideo(track.youtubeId);
        
        if (success) {
          setIsPlaying(true);
          setCurrentTime(startPosition);
          
          setYouTubeVolume(Math.round(volume * 100));
          
          if (startPosition > 0) {
            seekYouTubeVideo(startPosition);
          }
          
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
        } else {
          toast({
            title: "YouTube Playback Error",
            description: "Could not play this YouTube track. Please try again.",
            variant: "destructive"
          });
        }
      } else {
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
            
            if (roomId && isHost && !isUpdatingRef.current && !isPlaying) {
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
      }
    } catch (error) {
      console.error("Error playing track:", error);
      toast({
        title: "Error playing track",
        description: "An error occurred while trying to play this track.",
        variant: "destructive"
      });
    }
  }, [volume, roomId, sound, isHost, playYouTubeVideo, playerState.isPlaying, stopYouTubeVideo, seekYouTubeVideo, setYouTubeVolume]);

  const togglePlayPause = useCallback(() => {
    if (isYouTubeTrackRef.current) {
      if (isPlaying) {
        pauseYouTubeVideo();
        setIsPlaying(false);
      } else {
        resumeYouTubeVideo();
        setIsPlaying(true);
      }
      
      if (roomId && isHost && !isUpdatingRef.current && currentTrack) {
        isUpdatingRef.current = true;
        
        const playbackStateRef = ref(rtdb, `rooms/${roomId}/playbackState`);
        update(playbackStateRef, {
          isPlaying: !isPlaying,
          position: getYouTubeCurrentTime() || 0,
          serverTimestamp: Date.now()
        })
        .then(() => {
          socket.emit(isPlaying ? "pause" : "play", { roomId });
          socket.emit("playbackStateChanged", { 
            roomId, 
            state: isPlaying ? "pause" : "play" 
          });
        })
        .catch(error => {
          console.error("Error updating playback state:", error);
        })
        .finally(() => {
          isUpdatingRef.current = false;
        });
      }
    } else if (sound) {
      if (isPlaying) {
        sound.pause();
      } else {
        sound.play();
      }
    }
  }, [sound, isPlaying, isHost, roomId, currentTrack, pauseYouTubeVideo, resumeYouTubeVideo, getYouTubeCurrentTime]);

  const seek = useCallback((time: number) => {
    if (isYouTubeTrackRef.current) {
      seekYouTubeVideo(time);
      setCurrentTime(time);
    } else if (sound) {
      sound.seek(time);
      setCurrentTime(time);
    } else {
      return;
    }
    
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
  }, [sound, roomId, isHost, currentTrack, isPlaying, seekYouTubeVideo]);

  const setHowlerVolume = useCallback((newVolume: number) => {
    if (isYouTubeTrackRef.current) {
      setYouTubeVolume(Math.round(newVolume * 100));
    } else if (sound) {
      sound.volume(newVolume);
    }
  }, [sound, setYouTubeVolume]);

  const setupTimeTracking = useCallback((setCurrentTimeCallback: (time: number) => void) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (!sound && !isYouTubeTrackRef.current) return () => {};
    if (!isPlaying) return () => {};
    
    timerRef.current = setInterval(() => {
      try {
        let timeValue = 0;
        
        if (isYouTubeTrackRef.current) {
          timeValue = getYouTubeCurrentTime() || 0;
        } else if (sound) {
          const time = sound.seek();
          timeValue = typeof time === 'number' ? time : 0;
        }
        
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
  }, [sound, isPlaying, roomId, userId, getYouTubeCurrentTime]);
  
  useEffect(() => {
    return () => {
      if (sound) {
        sound.stop();
        sound.unload();
      }
      if (isYouTubeTrackRef.current) {
        stopYouTubeVideo();
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
  }, [sound, stopYouTubeVideo]);

  useEffect(() => {
    setHowlerVolume(volume);
  }, [volume, setHowlerVolume]);

  return {
    sound,
    isPlaying,
    currentTrack,
    currentTime,
    setCurrentTime,
    playTrack,
    togglePlayPause,
    seek,
    setVolume: setHowlerVolume,
    setupTimeTracking
  };
};
