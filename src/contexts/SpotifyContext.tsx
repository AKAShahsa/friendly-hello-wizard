
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SpotifyContextType {
  token: string;
  setToken: (token: string) => void;
  isTokenValid: boolean;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('spotify_token') || '';
  });
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);

  // Save token to localStorage when it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('spotify_token', token);
      checkTokenValidity(token);
    } else {
      setIsTokenValid(false);
    }
  }, [token]);

  // Check if the token is valid
  const checkTokenValidity = async (checkToken: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${checkToken}`,
        },
      });
      
      setIsTokenValid(response.status !== 401);
    } catch (error) {
      console.error('Error checking Spotify token validity:', error);
      setIsTokenValid(false);
    }
  };

  return (
    <SpotifyContext.Provider
      value={{
        token,
        setToken,
        isTokenValid
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotifyContext = (): SpotifyContextType => {
  const context = useContext(SpotifyContext);
  
  if (context === undefined) {
    throw new Error('useSpotifyContext must be used within a SpotifyProvider');
  }
  
  return context;
};
