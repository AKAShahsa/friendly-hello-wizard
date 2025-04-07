
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: {
    id: string;
    name: string;
    uri: string;
  }[];
  album: {
    id: string;
    name: string;
    images: {
      url: string;
      height?: number;
      width?: number;
    }[];
    uri: string;
  };
  duration_ms: number;
  uri: string;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  trackId: string;
  position: number;
  deviceId: string;
}
