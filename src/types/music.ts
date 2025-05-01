
export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  videoId?: string; // For YouTube tracks
  platform?: "spotify" | "youtube" | "default"; // Track source platform
}

export interface User {
  id: string;
  name: string;
  isHost: boolean;
  isActive: boolean;
  lastActive: number;
  profilePicture?: string;
  currentTrackId?: string;
  currentTime?: number;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isAI?: boolean;
  videoUrl?: string; // Added for video messages
}

export interface Reaction {
  thumbsUp: number;
  heart: number;
  smile: number;
}

export interface MusicContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  users: User[];
  roomId: string | null;
  reactions: Reaction;
  messages: ChatMessage[];
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  nextTrack: () => Track | null;
  prevTrack: () => Track | null;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  sendChatMessage: (message: string) => void;
  sendReaction: (reactionType: keyof Reaction) => void;
  addSongByUrl: (url: string) => Promise<boolean>;
  transferHostStatus: (userId: string) => void;
}
