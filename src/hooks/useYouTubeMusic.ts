
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

  // Initialize YouTube Player API
  useEffect(() => {
    // Create YouTube API script tag if it doesn't exist
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Initialize player when YouTube API is ready
    window.onYouTubeIframeAPIReady = () => {
      if (!document.getElementById('youtube-player')) {
        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player';
        playerDiv.style.position = 'absolute';
        playerDiv.style.top = '-9999px';
        playerDiv.style.left = '-9999px';
        document.body.appendChild(playerDiv);
      }

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
    };

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

    // Simulated response for development (in production, this would call the actual API)
    try {
      // Simulated API call - in real implementation, this would be:
      // const response = await fetch(`${YTM_API_BASE}/search?q=${encodeURIComponent(query)}`, {
      //   headers: {
      //     'Authorization': `Bearer ${apiPassword}`
      //   }
      // });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For development, create mock data based on the search query
      const mockSearchResults: YouTubeMusicTrack[] = Array.from({ length: 10 }, (_, i) => ({
        videoId: `video_${query.replace(/\s+/g, '_')}_${i}`,
        title: `${query} Song ${i + 1}`,
        artist: `Artist ${(i % 3) + 1}`,
        album: `Album ${(i % 5) + 1}`,
        thumbnail: `https://picsum.photos/seed/${query}_${i}/200/200`,
        duration: 180 + (i * 30) // 3-8 minutes
      }));
      
      setSearchResults(mockSearchResults);
      
      if (mockSearchResults.length === 0) {
        toast({
          title: "No results",
          description: "No tracks found for your search.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error searching tracks:", error);
      setError("Failed to search YouTube Music tracks. Is YTMDesktop running?");
      toast({
        title: "Search Failed",
        description: "Couldn't search YouTube Music tracks. Please ensure YTMDesktop is running.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiPassword]);

  // Play a YouTube video
  const playYouTubeVideo = useCallback((videoId: string) => {
    if (playerRef.current && playerRef.current.loadVideoById) {
      try {
        console.log(`Playing YouTube video: ${videoId}`);
        playerRef.current.loadVideoById(videoId);
        setPlayerState(prev => ({ 
          ...prev, 
          isPlaying: true, 
          currentVideoId: videoId 
        }));
        return true;
      } catch (error) {
        console.error("Error playing YouTube video:", error);
        toast({
          title: "Playback Error",
          description: "Could not play this YouTube Music track.",
          variant: "destructive"
        });
        return false;
      }
    } else {
      console.warn("YouTube player not ready");
      toast({
        title: "Player Not Ready",
        description: "YouTube player is not ready yet. Please try again in a moment.",
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
      duration: ytTrack.duration,
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
