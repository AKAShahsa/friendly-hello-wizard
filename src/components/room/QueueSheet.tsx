
import React, { useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
}

interface QueueSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  queue: Track[];
  currentTrack: Track | null;
  onPlayTrack?: (track: Track) => void;
}

const QueueSheet: React.FC<QueueSheetProps> = ({ 
  isOpen, 
  onOpenChange, 
  queue, 
  currentTrack,
  onPlayTrack 
}) => {
  useEffect(() => {
    if (isOpen) {
      console.log("Queue in QueueSheet:", queue);
      console.log("Current track in QueueSheet:", currentTrack);
    }
  }, [queue, currentTrack, isOpen]);

  // Prevent rapid song changes by debouncing the play track function
  const [lastClickedTrackId, setLastClickedTrackId] = React.useState<string | null>(null);
  const [isClickDisabled, setIsClickDisabled] = React.useState(false);

  const handlePlayTrack = (track: Track) => {
    if (isClickDisabled || lastClickedTrackId === track.id || currentTrack?.id === track.id) {
      return;
    }
    
    setIsClickDisabled(true);
    setLastClickedTrackId(track.id);
    
    if (onPlayTrack) {
      onPlayTrack(track);
    }
    
    // Re-enable clicking after a longer delay to prevent race conditions
    setTimeout(() => {
      setIsClickDisabled(false);
    }, 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left">
        <div className="h-full flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Queue</h2>
          <ScrollArea className="flex-1">
            {queue.length > 0 ? (
              <div className="space-y-3">
                {queue.map(track => (
                  <div 
                    key={track.id}
                    className={`flex items-center gap-3 p-2 rounded-md ${
                      currentTrack?.id === track.id ? "bg-primary/10" : "hover:bg-secondary/80"
                    }`}
                  >
                    <img 
                      src={track.coverUrl} 
                      alt={track.title} 
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{track.title}</div>
                      <div className="text-sm text-muted-foreground truncate">{track.artist}</div>
                    </div>
                    {onPlayTrack && currentTrack?.id !== track.id && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handlePlayTrack(track)}
                        disabled={isClickDisabled}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {currentTrack?.id === track.id && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No tracks in queue</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QueueSheet;
