// queueSheet.tsx

import React, { useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast"; // Import use-toast

// Define the Track interface (assuming it's not imported from elsewhere)
interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
}

// --- Updated Props Interface ---
interface QueueSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  queue: Track[];
  currentTrack: Track | null;
  isHost: boolean; // Added: To know if the current user is the host
  onSetCurrentTrack: (track: Track) => void; // Changed: Function to update Firebase
}

const QueueSheet: React.FC<QueueSheetProps> = ({
  isOpen,
  onOpenChange,
  queue,
  currentTrack,
  isHost, // Destructure isHost
  onSetCurrentTrack // Destructure onSetCurrentTrack
}) => {

  useEffect(() => {
    // Keep console logs for debugging if needed
    if (isOpen) {
      console.log("Queue in QueueSheet:", queue);
      console.log("Current track in QueueSheet:", currentTrack);
    }
  }, [queue, currentTrack, isOpen]);

  // --- Removed State ---
  // Removed: lastClickedTrackId, isClickDisabled state and related logic

  // --- Rewritten handlePlayTrack ---
  const handlePlayTrack = (track: Track) => {
    // 1. Prevent action if the track is already playing
    if (currentTrack?.id === track.id) {
      console.log("Track already playing, ignoring click:", track.id);
      return;
    }

    // 2. Check if the user is the host
    if (isHost) {
      // 3. If host, call the function passed via props to update Firebase
      console.log("Host clicking to set current track in Firebase:", track.id);
      onSetCurrentTrack(track);
      // No local playback call here - playback is driven by Firebase listener
    } else {
      // 4. If not host, inform the user they cannot change the track
      toast({
        title: "Action Denied",
        description: "Only the host can change the currently playing track.",
        variant: "default" // Or another appropriate variant
      });
      console.log("Non-host click ignored for track:", track.id);
    }
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

                    {/* --- Updated Button Rendering --- */}
                    {/* Only show play button if user is host AND track is not current */}
                    {isHost && currentTrack?.id !== track.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePlayTrack(track)}
                        // Removed disabled attribute
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Indicator for the currently playing track */}
                    {currentTrack?.id === track.id && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse ml-auto mr-2" /> // Added margin for spacing
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
