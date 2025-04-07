
import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Music, Play, Plus } from "lucide-react";
import { useSpotify, SpotifyTrack } from "@/hooks/useSpotify";
import { Track } from "@/types/music";
import { toast } from "@/hooks/use-toast";
import { socket, broadcastToast } from "@/lib/socket";

interface SpotifySearchSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddTrack: (track: Track) => void;
  onPlayTrack?: (track: Track) => void;
  spotifyToken: string;
  roomId?: string | null;
}

const SpotifySearchSheet: React.FC<SpotifySearchSheetProps> = ({
  isOpen,
  onOpenChange,
  onAddTrack,
  onPlayTrack,
  spotifyToken,
  roomId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [lastAddedTrackId, setLastAddedTrackId] = useState<string | null>(null);
  const { searchTracks, searchResults, isLoading, convertToAppTrack } = useSpotify(spotifyToken);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchTracks(debouncedQuery);
    }
  }, [debouncedQuery, searchTracks]);

  const handleAddTrack = (spotifyTrack: SpotifyTrack) => {
    const appTrack = convertToAppTrack(spotifyTrack);
    
    // Prevent duplicate rapid adds
    if (lastAddedTrackId === spotifyTrack.id) return;
    
    setLastAddedTrackId(spotifyTrack.id);
    setTimeout(() => setLastAddedTrackId(null), 3000);
    
    onAddTrack(appTrack);
    
    if (roomId) {
      broadcastToast(
        roomId,
        "Spotify track added",
        `"${spotifyTrack.name}" by ${spotifyTrack.artists[0]?.name} added to queue`
      );
    } else {
      toast({
        title: "Spotify track added",
        description: `"${spotifyTrack.name}" by ${spotifyTrack.artists[0]?.name} added to queue`,
      });
    }
  };

  const handlePlayTrack = (spotifyTrack: SpotifyTrack) => {
    if (!onPlayTrack) return;
    
    const appTrack = convertToAppTrack(spotifyTrack);
    onPlayTrack(appTrack);
    
    if (roomId) {
      broadcastToast(
        roomId,
        "Now playing Spotify track",
        `"${spotifyTrack.name}" by ${spotifyTrack.artists[0]?.name}`
      );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Search Spotify</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-200px)]">
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/80"
                  >
                    <img
                      src={track.album.images[0]?.url || "https://upload.wikimedia.org/wikipedia/commons/c/ca/CD-ROM.png"}
                      alt={track.name}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{track.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {track.artists.map((artist) => artist.name).join(", ")}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {onPlayTrack && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePlayTrack(track)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleAddTrack(track)}
                        disabled={lastAddedTrackId === track.id}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length > 0 && !isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No tracks found</p>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SpotifySearchSheet;
