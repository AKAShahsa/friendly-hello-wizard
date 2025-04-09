// Track interface
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  // Optional Spotify fields
  spotifyId?: string;
  isSpotify?: boolean;
  // Optional YouTube Music fields
  youtubeId?: string;
  isYouTubeMusic?: boolean;
}

export interface User {
  id: string;
  name: string;
  isHost: boolean;
  isActive: boolean;
  lastActive: number;
  avatar?: string;
  currentTime?: number;
  typing?: boolean;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isAI?: boolean;
  reactions?: {[key: string]: string[]};
}

export interface Reaction {
  thumbsUp: number;
  heart: number;
  smile: number;
  [key: string]: number;
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
  createRoom: (userName: string) => Promise<string>;
  joinRoom: (roomId: string, userName: string) => Promise<boolean>;
  leaveRoom: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  playTrack: (track: Track, isRemoteChange?: boolean) => void;
  togglePlayPause: () => void;
  nextTrack: () => Track | null;
  prevTrack: () => Track | null;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  sendChatMessage: (text: string) => void;
  sendReaction: (type: keyof Reaction) => void;
  addSongByUrl: (url: string, title?: string, artist?: string) => Promise<boolean>;
  transferHostStatus: (userId: string) => void;
}
