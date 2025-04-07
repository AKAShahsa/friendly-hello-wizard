
import { useState, useCallback } from "react";
import { Track } from "@/types/music";
import { toast } from "@/hooks/use-toast";
import { YouTubeMusicTrack, YouTubeMusicSearchResponse } from "@/types/youtube";

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

  // Convert YouTube Music track to app Track format
  const convertToAppTrack = useCallback((ytTrack: YouTubeMusicTrack): Track => {
    return {
      id: `ytmusic_${ytTrack.videoId}`,
      title: ytTrack.title,
      artist: ytTrack.artist,
      album: ytTrack.album || "YouTube Music",
      coverUrl: ytTrack.thumbnail,
      // In a real implementation, this would be the actual audio URL or stream
      // For this prototype, we'll use a placeholder audio URL
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      duration: ytTrack.duration,
      ytMusicId: ytTrack.videoId,
      isYouTubeMusic: true,
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
  };
};
