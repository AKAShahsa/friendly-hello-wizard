
import React, { createContext, useContext } from 'react';
import { SpotifyTrack } from '@/types/spotify';
import { Track } from '@/types/music';
import { useSpotifyApi } from '@/hooks/useSpotify';

// Create a context
interface SpotifyContextType {
  token: string;
  setToken: (token: string) => void;
  searchTracks: (query: string) => Promise<void>;
  searchResults: SpotifyTrack[];
  isLoading: boolean;
  error: string | null;
  convertToAppTrack: (spotifyTrack: SpotifyTrack) => Track;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    token,
    setToken,
    searchTracks,
    searchResults: apiSearchResults,
    isLoading,
    error,
    convertToAppTrack
  } = useSpotifyApi();

  // Store value to be provided
  const value: SpotifyContextType = {
    token,
    setToken,
    searchTracks,
    searchResults: apiSearchResults,
    isLoading,
    error,
    convertToAppTrack
  };

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  );
};

// Use context hook
export const useSpotify = () => {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
};
