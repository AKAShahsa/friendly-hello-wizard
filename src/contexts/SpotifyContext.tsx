
import React, { createContext, useContext, useState } from 'react';
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

  // Convert search results to match the expected SpotifyTrack type
  const searchResults: SpotifyTrack[] = apiSearchResults.map(track => ({
    ...track,
    id: track.id,
    name: track.name,
    artists: track.artists.map(artist => ({
      id: artist.id || '',
      name: artist.name,
      uri: artist.uri || ''
    })),
    album: {
      id: track.album.id || '',
      name: track.album.name,
      images: track.album.images,
      uri: track.album.uri || ''
    },
    duration_ms: track.duration_ms,
    uri: track.external_urls.spotify,
    preview_url: track.preview_url,
    external_urls: track.external_urls
  }));

  // Store value to be provided
  const value: SpotifyContextType = {
    token,
    setToken,
    searchTracks,
    searchResults,
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
