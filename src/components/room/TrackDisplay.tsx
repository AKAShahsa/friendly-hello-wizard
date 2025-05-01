
import React from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Music } from "lucide-react";
import { Track } from "@/types/music";

interface TrackDisplayProps {
  currentTrack: Track | null;
}

const TrackDisplay: React.FC<TrackDisplayProps> = ({ currentTrack }) => {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      {currentTrack ? (
        <>
          <div className="mb-6 rounded-lg overflow-hidden shadow-xl">
            <AspectRatio ratio={1/1}>
              <img 
                src={currentTrack.coverUrl || currentTrack.thumbnail} 
                alt={`${currentTrack.title} by ${currentTrack.artist}`} 
                className="w-full h-full object-cover transition-transform hover:scale-105 duration-700"
              />
            </AspectRatio>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold truncate">{currentTrack.title}</h2>
            <p className="text-muted-foreground truncate">{currentTrack.artist}</p>
            <p className="text-sm text-muted-foreground">{currentTrack.album}</p>
          </div>
        </>
      ) : (
        <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
          <Music className="h-20 w-20 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
};

export default TrackDisplay;
