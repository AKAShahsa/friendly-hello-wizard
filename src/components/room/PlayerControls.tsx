
import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX } from "lucide-react";

// Format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

interface PlayerControlsProps {
  currentTrack: any | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  volume,
  togglePlayPause,
  nextTrack,
  prevTrack,
  seek,
  setVolume
}) => {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress Bar */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs">{formatTime(currentTime)}</span>
        <Slider 
          value={[currentTime]} 
          max={currentTrack?.duration || 100}
          step={1}
          onValueChange={(value) => seek(value[0])}
          className="flex-1"
        />
        <span className="text-xs">{formatTime(currentTrack?.duration || 0)}</span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={prevTrack}>
          <SkipBack className="h-6 w-6" />
        </Button>
        <Button 
          className="h-14 w-14 rounded-full" 
          onClick={togglePlayPause}
          disabled={!currentTrack}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={nextTrack}>
          <SkipForward className="h-6 w-6" />
        </Button>
      </div>

      {/* Volume Slider */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setVolume(volume === 0 ? 0.7 : 0)}>
          {volume === 0 ? (
            <VolumeX className="h-5 w-5" />
          ) : volume < 0.5 ? (
            <Volume1 className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
        <Slider 
          value={[volume * 100]} 
          max={100}
          step={1}
          onValueChange={(value) => setVolume(value[0] / 100)}
          className="flex-1"
        />
      </div>
    </div>
  );
};

export default PlayerControls;
