
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
}

export interface User {
  id: string;
  name: string;
  isActive: boolean;
  lastActive: number;
  isHost?: boolean;
}

export interface Reaction {
  thumbsUp: number;
  heart: number;
  smile: number;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isAI?: boolean; // Optional flag to mark AI messages
}

export interface MessageReaction {
  messageId: string;
  userId: string;
  userName: string;
  reactionType: keyof Reaction;
  timestamp: number;
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
  createRoom: (name: string) => Promise<string>;
  joinRoom: (roomId: string, userName: string) => Promise<boolean>;
  leaveRoom: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  sendChatMessage: (message: string) => void;
  sendReaction: (reactionType: keyof Reaction) => void;
  addSongByUrl: (url: string, title?: string, artist?: string) => Promise<boolean>;
  transferHostStatus: (newHostId: string) => void;
}
