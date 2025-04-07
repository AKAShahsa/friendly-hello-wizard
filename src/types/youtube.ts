
// YouTube Music Track interface
export interface YouTubeMusicTrack {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail: string;
  duration: number; // Duration in seconds
}

// API Response types
export interface YouTubeMusicSearchResponse {
  result: YouTubeMusicTrack[];
  status: "success" | "error";
  message?: string;
}

export interface YouTubeMusicPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  track: YouTubeMusicTrack | null;
}

export interface YouTubeMusicApiResponse {
  status: "success" | "error";
  message?: string;
  data?: any;
}
