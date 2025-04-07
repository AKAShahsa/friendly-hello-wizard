
import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Track } from "@/types/music";
import { useSpotifyApi } from "@/hooks/useSpotify";
import { Loader2, Music, Play, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SpotifySearchSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTrack: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  spotifyToken: string;
  roomId?: string;
}

const SpotifySearchSheet: React.FC<SpotifySearchSheetProps> = ({
  isOpen,
  onOpenChange,
  onAddTrack,
  onPlayTrack,
  spotifyToken,
  roomId
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { searchTracks, searchResults, isLoading, error, convertToAppTrack, setToken } = useSpotifyApi(spotifyToken);
  
  // Set token when it changes
  useEffect(() => {
    if (spotifyToken) {
      setToken(spotifyToken);
    }
  }, [spotifyToken, setToken]);
  
  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await searchTracks(searchQuery);
  };
  
  // Handle key press (Enter) for search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  
  // Handle add to queue
  const handleAddToQueue = (spotifyTrack: any) => {
    try {
      const track = convertToAppTrack(spotifyTrack);
      onAddTrack(track);
      toast({
        title: "Added to Queue",
        description: `${track.title} by ${track.artist} added to queue`
      });
    } catch (error) {
      console.error("Error adding to queue:", error);
      toast({
        title: "Error",
        description: "Could not add track to queue",
        variant: "destructive"
      });
    }
  };
  
  // Handle play now
  const handlePlayNow = (spotifyTrack: any) => {
    try {
      const track = convertToAppTrack(spotifyTrack);
      onPlayTrack(track);
      toast({
        title: "Now Playing",
        description: `${track.title} by ${track.artist}`
      });
      onOpenChange(false); // Close sheet after playing
    } catch (error) {
      console.error("Error playing track:", error);
      toast({
        title: "Error",
        description: "Could not play track",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Spotify Search</SheetTitle>
          <SheetDescription>
            Search for songs on Spotify and add them to the queue.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for songs, artists, or albums"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md mt-4">
              {error}
            </div>
          )}
          
          <div className="mt-6 space-y-2">
            {searchResults.map((track) => (
              <div 
                key={track.id} 
                className="flex items-center gap-3 p-3 rounded-md hover:bg-accent border"
              >
                <div className="w-12 h-12 flex-shrink-0">
                  {track.album.images[0] ? (
                    <img 
                      src={track.album.images[0].url} 
                      alt={track.album.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm leading-tight truncate">
                    {track.name}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {track.artists.map(a => a.name).join(", ")}
                  </p>
                </div>
                
                <div className="flex gap-1">
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => handleAddToQueue(track)}
                    title="Add to queue"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon"
                    onClick={() => handlePlayNow(track)}
                    title="Play now"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {searchResults.length === 0 && !isLoading && searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                No results found
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SpotifySearchSheet;
