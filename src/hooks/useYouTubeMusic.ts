
import { useState, useCallback, useEffect, useRef } from "react";
import { Track } from "@/types/music";
import { toast } from "@/hooks/use-toast";
import { YouTubeMusicTrack, YouTubePlayerState } from "@/types/youtube";

// YTMDesktop API base URL (this would be the local address when the app is running)
const YTM_API_BASE = "http://localhost:9863/api";
const DEFAULT_API_PASSWORD = ""; // Empty default password

export const useYouTubeMusic = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<YouTubeMusicTrack[]>([]);
  const [apiPassword, setApiPassword] = useState<string>(
    localStorage.getItem("ytm_api_password") || DEFAULT_API_PASSWORD
  );
  const [playerState, setPlayerState] = useState<YouTubePlayerState>({
    player: null,
    isReady: false,
    isPlaying: false,
    currentVideoId: null
  });
  
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize YouTube Player API
  useEffect(() => {
    // Create container for YouTube player if it doesn't exist
    if (!document.getElementById('youtube-player-container')) {
      const container = document.createElement('div');
      container.id = 'youtube-player-container';
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      playerContainerRef.current = container;
    }

    // Create YouTube API script tag if it doesn't exist
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Initialize player when YouTube API is ready
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API is ready, initializing player');
      
      if (!playerContainerRef.current) {
        playerContainerRef.current = document.getElementById('youtube-player-container') as HTMLDivElement;
      }
      
      // Add player div if it doesn't exist
      if (!document.getElementById('youtube-player')) {
        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player';
        playerContainerRef.current?.appendChild(playerDiv);
      }

      try {
        const player = new window.YT.Player('youtube-player', {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1
          },
          events: {
            onReady: () => {
              console.log('YouTube player ready');
              setPlayerState(prev => ({ ...prev, player, isReady: true }));
              playerRef.current = player;
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setPlayerState(prev => ({ ...prev, isPlaying: true }));
              } else if (event.data === window.YT.PlayerState.PAUSED || 
                         event.data === window.YT.PlayerState.ENDED) {
                setPlayerState(prev => ({ ...prev, isPlaying: false }));
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event);
              toast({
                title: "YouTube Music Error",
                description: "There was an error playing this track. Please try another track.",
                variant: "destructive"
              });
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    // If YouTube API is already loaded, manually trigger onYouTubeIframeAPIReady
    if (window.YT && window.YT.Player) {
      console.log('YouTube API already loaded, manually triggering initialization');
      window.onYouTubeIframeAPIReady();
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.stopVideo();
      }
    };
  }, []);

  // Store API password in localStorage
  const setPassword = (password: string) => {
    setApiPassword(password);
    localStorage.setItem("ytm_api_password", password);
  };

  // Search for tracks
  const searchTracks = useCallback(async (query: string) => {
    if (!query || query.length === 0) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Real YouTube search API call using a public API proxy
      const response = await fetch(`https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query + " music")}&key=AIzaSyDAVB-m8TlFEiXY4G3NyrWKqK-iXQkwQQk`);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const tracks: YouTubeMusicTrack[] = data.items
          .filter((item: any) => item.id.videoId) // Only get videos, not playlists or channels
          .map((item: any) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            album: 'YouTube Music',
            thumbnail: item.snippet.thumbnails.high.url || item.snippet.thumbnails.default.url,
            duration: 0 // Duration requires a separate API call, defaulting to 0
          }));
          
        setSearchResults(tracks);
      } else {
        setSearchResults([]);
        toast({
          title: "No results",
          description: "No tracks found for your search.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error searching tracks:", error);
      
      // Fallback to mock data if the API fails
      const mockSearchResults: YouTubeMusicTrack[] = Array.from({ length: 5 }, (_, i) => ({
        videoId: `video_${i}_${Date.now()}`,
        title: `${query} Song ${i + 1}`,
        artist: `Artist ${(i % 3) + 1}`,
        album: `Album ${(i % 5) + 1}`,
        thumbnail: `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`,
        duration: 180 + (i * 30) // 3-8 minutes
      }));
      
      setSearchResults(mockSearchResults);
      
      setError("YouTube API search failed. Using fallback data.");
      toast({
        title: "Search Failed",
        description: "Couldn't fetch YouTube Music tracks. Using fallback data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Play a YouTube video
  const playYouTubeVideo = useCallback((videoId: string) => {
    console.log(`Attempting to play YouTube video: ${videoId}`);
    
    if (!playerRef.current) {
      console.warn("YouTube player not initialized");
      toast({
        title: "Player Not Ready",
        description: "YouTube player is not initialized. Trying to set up player...",
        variant: "destructive"
      });
      
      // Try to initialize the player if it doesn't exist
      if (window.YT && window.YT.Player) {
        window.onYouTubeIframeAPIReady();
        // Return false but don't block the attempt - the player might initialize quickly
      } else {
        return false;
      }
    }
    
    try {
      if (playerRef.current && playerRef.current.loadVideoById) {
        console.log(`Playing YouTube video: ${videoId}`);
        playerRef.current.loadVideoById(videoId);
        playerRef.current.playVideo();
        
        setPlayerState(prev => ({ 
          ...prev, 
          isPlaying: true, 
          currentVideoId: videoId 
        }));
        
        return true;
      } else {
        console.warn("YouTube player not ready or missing loadVideoById method");
        
        // Attempt to initialize again
        if (window.YT && window.YT.Player && document.getElementById('youtube-player')) {
          const player = new window.YT.Player('youtube-player', {
            events: {
              onReady: () => {
                console.log('YouTube player ready after retry');
                playerRef.current = player;
                setPlayerState(prev => ({ ...prev, player, isReady: true }));
                
                // Try to play the video after initialization
                setTimeout(() => {
                  if (player && player.loadVideoById) {
                    player.loadVideoById(videoId);
                    player.playVideo();
                    setPlayerState(prev => ({ 
                      ...prev, 
                      isPlaying: true, 
                      currentVideoId: videoId 
                    }));
                  }
                }, 1000);
              }
            }
          });
        }
        
        toast({
          title: "Player Not Ready",
          description: "YouTube player is not ready yet. Please try again in a moment.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("Error playing YouTube video:", error);
      toast({
        title: "Playback Error",
        description: "Could not play this YouTube Music track.",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  // Pause current video
  const pauseVideo = useCallback(() => {
    if (playerRef.current && playerState.isPlaying) {
      playerRef.current.pauseVideo();
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [playerState.isPlaying]);

  // Resume current video
  const resumeVideo = useCallback(() => {
    if (playerRef.current && !playerState.isPlaying && playerState.currentVideoId) {
      playerRef.current.playVideo();
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [playerState.isPlaying, playerState.currentVideoId]);

  // Seek to specific time
  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && playerState.currentVideoId) {
      playerRef.current.seekTo(seconds, true);
    }
  }, [playerState.currentVideoId]);

  // Stop video
  const stopVideo = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stopVideo();
      setPlayerState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentVideoId: null 
      }));
    }
  }, []);

  // Get current time
  const getCurrentTime = useCallback(() => {
    if (playerRef.current && playerState.isPlaying) {
      return playerRef.current.getCurrentTime();
    }
    return 0;
  }, [playerState.isPlaying]);

  // Set volume (0-100)
  const setVolume = useCallback((volume: number) => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, []);

  // Convert YouTube Music track to app Track format
  const convertToAppTrack = useCallback((ytTrack: YouTubeMusicTrack): Track => {
    return {
      id: `ytmusic_${ytTrack.videoId}`,
      title: ytTrack.title,
      artist: ytTrack.artist,
      album: ytTrack.album || "YouTube Music",
      coverUrl: ytTrack.thumbnail,
      audioUrl: "", // Using YouTube iframe instead of direct audio URL
      duration: ytTrack.duration || 180, // Default to 3 min if duration unknown
      isYouTubeMusic: true,
      youtubeId: ytTrack.videoId // Add YouTube video ID for direct playback
    };
  }, []);

  return {
    searchTracks,
    searchResults,
    isLoading,
    error,
    convertToAppTrack,
    setPassword,
    apiPassword,
    // YouTube player controls
    playYouTubeVideo,
    pauseVideo,
    resumeVideo,
    seekTo,
    stopVideo,
    getCurrentTime,
    setVolume,
    playerState
  };
};

// Declare global YouTube iframe API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
