// queueSheet.tsx

import React, { useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Play, Trash2 } from "lucide-react"; // Added Trash2
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// Define the Track interface (ensure consistent with types/music)
interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
}

// --- Props Interface with isHost and onSetCurrentTrack ---
interface QueueSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  queue: Track[];
  currentTrack: Track | null;
  isHost: boolean; // To know if the current user is the host
  onSetCurrentTrack: (track: Track) => void; // Function to update Firebase currentTrack
  onRemoveFromQueue: (trackId: string) => void; // Function to remove track
}

const QueueSheet: React.FC<QueueSheetProps> = ({
  isOpen,
  onOpenChange,
  queue,
  currentTrack,
  isHost,
  onSetCurrentTrack,
  onRemoveFromQueue // Destructure remove function
}) => {

  useEffect(() => {
    if (isOpen) {
      // console.log("QueueSheet Props:", { isOpen, queue, currentTrack, isHost }); // Combined log
    }
  }, [isOpen, queue, currentTrack, isHost]); // Added isHost dependency

  // --- handlePlayTrack (for Host) ---
  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      console.log("Track already playing, ignoring click:", track.id);
      return;
    }

    // Only host can set the track
    if (isHost) {
      console.log("Host clicking to set current track in Firebase:", track.id);
      onSetCurrentTrack(track); // Call prop function to update Firebase
    } else {
      // This case should ideally not happen if button isn't rendered for non-hosts,
      // but keep for robustness / potential future UI changes.
      toast({
        title: "Action Denied",
        description: "Only the host can change the currently playing track.",
        variant: "default"
      });
      console.log("Non-host click detected (should not happen with current UI).");
    }
  };

  // --- handleRemoveTrack (for Host) ---
  const handleRemoveTrack = (trackId: string) => {
     if (isHost) {
         console.log("Host clicking to remove track:", trackId);
         onRemoveFromQueue(trackId); // Call prop function
     } else {
         // Button shouldn't be visible, but handle defensively
         toast({ title: "Action Denied", description: "Only the host can remove tracks.", variant: "default" });
     }
  };


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-sm"> {/* Added responsive width */}
        <div className="h-full flex flex-col">
          <h2 className="text-xl font-semibold mb-4 p-4 border-b">Queue</h2> {/* Added padding/border */}
          <ScrollArea className="flex-1">
            {queue.length > 0 ? (
              <div className="space-y-1 p-4"> {/* Adjusted padding/spacing */}
                {queue.map(track => (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                      currentTrack?.id === track.id
                        ? "bg-primary/10 ring-1 ring-primary/30" // Highlight current track more
                        : "hover:bg-muted/50" // Use muted for hover
                    }`}
                  >
                    <img
                      src={track.coverUrl || "/images/default-cover.png"} // Fallback image
                      alt={track.title}
                      className="h-10 w-10 rounded object-cover flex-shrink-0" // Adjusted size
                      onError={(e) => { e.currentTarget.src = "/images/default-cover.png"; }} // Handle image load errors
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{track.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
                    </div>

                    {/* --- Play Button (Host Only, Not Current Track) --- */}
                    {isHost && currentTrack?.id !== track.id && (
                      <Button
                        aria-label={`Play ${track.title}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary flex-shrink-0" // Style adjustments
                        onClick={() => handlePlayTrack(track)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}

                    {/* --- Remove Button (Host Only) --- */}
                    {isHost && (
                         <Button
                            aria-label={`Remove ${track.title}`}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" // Style adjustments
                            onClick={() => handleRemoveTrack(track.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}


                    {/* --- Current Track Indicator --- */}
                    {currentTrack?.id === track.id && (
                      // Position indicator reliably, maybe instead of a button space
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" title="Currently Playing"/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground px-4">
                <Music className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">The queue is empty.</p>
                <p className="text-xs mt-1">Add songs by searching or pasting audio URLs.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QueueSheet;
