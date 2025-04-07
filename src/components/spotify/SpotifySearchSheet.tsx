
import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Track } from "@/types/music";
import { useSpotify } from "@/contexts/SpotifyContext";
import { Loader2, Music, Play, Plus, Key, Info, Search } from "lucide-react";
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
  const [tokenInput, setTokenInput] = useState(spotifyToken || "");
  const { searchTracks, searchResults, isLoading, error, convertToAppTrack, setToken, token } = useSpotify();
  
  // Set token when it changes
  useEffect(() => {
    if (spotifyToken) {
      setToken(spotifyToken);
      setTokenInput(spotifyToken);
    }
  }, [spotifyToken, setToken]);
  
  // Handle search on each keystroke
  useEffect(() => {
    searchTracks(searchQuery);
  }, [searchQuery, searchTracks]);
  
  // Handle key press (Enter) for search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Apply the search (though it's already happening in real-time)
      searchTracks(searchQuery);
    }
  };
  
  // Update token
  const handleUpdateToken = () => {
    if (tokenInput.trim()) {
      setToken(tokenInput);
      toast({
        title: "Token Updated",
        description: "Spotify token has been updated"
      });
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
            Search for songs on Spotify with free preview availability.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4">
          {/* Spotify Token Input */}
          <div className="mb-4">
            <label htmlFor="spotify-token" className="text-sm font-medium mb-1 block">
              Spotify Token
            </label>
            <div className="flex gap-2">
              <Input
                id="spotify-token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter your Spotify token"
              />
              <Button onClick={handleUpdateToken}>
                <Key className="h-4 w-4 mr-2" />
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Only songs with free previews will be shown
            </p>
          </div>
          
          <div className="flex gap-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Start typing to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className="pl-10"
            />
          </div>
          
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md mt-4">
              {error}
            </div>
          )}
          
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>Search instantly shows tracks with free 30-second previews</span>
          </div>
          
          <div className="mt-6 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
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
                No free preview tracks found. Try another search.
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {!searchQuery && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Start typing to see matching songs with free previews
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SpotifySearchSheet;
