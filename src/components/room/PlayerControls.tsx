
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Format seconds to MM:SS
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "0:00";
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
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const lastSeekTimeRef = useRef(0);
  
  // Apply throttling to seek operations to avoid overwhelming the server
  const throttledSeek = (time: number) => {
    const now = Date.now();
    if (now - lastSeekTimeRef.current > 250) { // Throttle to max 4 seeks per second
      lastSeekTimeRef.current = now;
      seek(time);
      setLocalProgress(time);
    }
  };

  // Update local progress when currentTime changes, but only if not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(currentTime);
    }
  }, [currentTime, isDragging]);

  // Calculate progress percentage
  const progressPercentage = currentTrack?.duration 
    ? Math.min((localProgress / currentTrack.duration) * 100, 100) 
    : 0;

  // Handle clicks on the progress bar for seeking
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const seekTime = clickPosition * currentTrack.duration;
    
    throttledSeek(seekTime);
  };

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    if (!currentTrack) return;
    
    const newTime = (value[0] / 100) * currentTrack.duration;
    setLocalProgress(newTime);
    setIsDragging(true);
  };

  // Handle slider commit
  const handleSliderCommit = (value: number[]) => {
    if (!currentTrack) return;
    
    const newTime = (value[0] / 100) * currentTrack.duration;
    throttledSeek(newTime);
    setIsDragging(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress Bar */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs">{formatTime(localProgress)}</span>
        <div className="flex-1 relative" ref={progressRef}>
          <Slider
            value={[progressPercentage]}
            max={100}
            step={0.1}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            disabled={!currentTrack}
          />
        </div>
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
