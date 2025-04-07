
import { useState, useEffect, useCallback } from "react";
import { Track } from "@/types/music";
import { toast } from "@/hooks/use-toast";
import { SpotifyTrack } from "@/types/spotify";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const DEFAULT_SPOTIFY_TOKEN = ""; // Empty default token

export const useSpotifyApi = (apiToken?: string) => {
  const [token, setToken] = useState<string>(apiToken || localStorage.getItem("spotify_token") || DEFAULT_SPOTIFY_TOKEN);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);

  // Update token if provided via props
  useEffect(() => {
    if (apiToken) {
      setToken(apiToken);
      localStorage.setItem("spotify_token", apiToken);
    } else {
      // Try to get from localStorage as fallback
      const savedToken = localStorage.getItem("spotify_token");
      if (savedToken) {
        setToken(savedToken);
      }
    }
  }, [apiToken]);

  // Check if token is valid
  const checkTokenValidity = useCallback(async (): Promise<boolean> => {
    if (!token) {
      return false;
    }
    
    try {
      const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.status !== 401;
    } catch (error) {
      console.error("Error checking token validity:", error);
      return false;
    }
  }, [token]);

  // Search for tracks
  const searchTracks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!token) {
        setError("No Spotify token provided");
        toast({
          title: "Spotify Error",
          description: "Please enter your Spotify token to search tracks.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const isValid = await checkTokenValidity();
      if (!isValid) {
        setError("Spotify token is invalid or expired");
        toast({
          title: "Spotify Error",
          description: "Authentication failed. Please update your Spotify token.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(
          query
        )}&type=track&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.tracks.items);
    } catch (error) {
      console.error("Error searching tracks:", error);
      setError("Failed to search tracks");
      toast({
        title: "Search Failed",
        description: "Couldn't search Spotify tracks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, checkTokenValidity]);

  // Convert Spotify track to app Track format
  const convertToAppTrack = useCallback((spotifyTrack: SpotifyTrack): Track => {
    return {
      id: `spotify_${spotifyTrack.id}`,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists.map(artist => artist.name).join(", "),
      album: spotifyTrack.album.name,
      coverUrl: spotifyTrack.album.images[0]?.url || "https://upload.wikimedia.org/wikipedia/commons/c/ca/CD-ROM.png",
      // For non-premium, we use preview_url if available, otherwise external URL for full playback
      audioUrl: spotifyTrack.preview_url || spotifyTrack.external_urls.spotify,
      duration: Math.floor(spotifyTrack.duration_ms / 1000), // Convert ms to seconds
      spotifyId: spotifyTrack.id, // Add Spotify ID for reference
      isSpotify: true,
    };
  }, []);

  return {
    searchTracks,
    searchResults,
    isLoading,
    error,
    convertToAppTrack,
    setToken,
    token,
  };
};
