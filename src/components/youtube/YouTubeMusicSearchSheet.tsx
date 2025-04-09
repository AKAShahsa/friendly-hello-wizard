
import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Music, Play, Plus, Youtube } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Track } from "@/types/music";
import { useYouTubeMusic } from "@/hooks/useYouTubeMusic";
import { YouTubeMusicTrack } from "@/types/youtube";

interface YouTubeMusicSearchSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddTrack: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  roomId: string | undefined;
}

const YouTubeMusicSearchSheet: React.FC<YouTubeMusicSearchSheetProps> = ({
  isOpen,
  onOpenChange,
  onAddTrack,
  onPlayTrack,
  roomId
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { 
    searchTracks, 
    searchResults, 
    isLoading, 
    error, 
    convertToAppTrack,
    playYouTubeVideo 
  } = useYouTubeMusic();
  
  useEffect(() => {
    if (isOpen && searchQuery.trim().length > 0) {
      searchTracks(searchQuery);
    }
  }, [isOpen, searchQuery, searchTracks]);

  const handleAddTrack = (ytTrack: YouTubeMusicTrack) => {
    const track = convertToAppTrack(ytTrack);
    onAddTrack(track);
    toast({
      title: "Track added to queue",
      description: `${track.title} by ${track.artist} added to the queue`
    });
  };

  const handlePlayTrack = (ytTrack: YouTubeMusicTrack) => {
    const track = convertToAppTrack(ytTrack);
    
    // First check if the YouTube player can play this video
    const canPlay = playYouTubeVideo(ytTrack.videoId);
    
    if (canPlay) {
      onPlayTrack(track);
      toast({
        title: "Now playing",
        description: `Playing ${track.title} by ${track.artist}`
      });
      onOpenChange(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      searchTracks(searchQuery);
    }
  };

  // Handle search as you type
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length > 1) {
      searchTracks(query);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube Music Search
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search for songs..."
                value={searchQuery}
                onChange={handleSearchInput}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {error && (
            <div className="p-4 text-center text-red-500 bg-red-50 rounded-md mb-4">
              {error}
            </div>
          )}

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                <p className="mt-2">Searching YouTube Music...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((track) => (
                  <div
                    key={track.videoId}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/80"
                  >
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{track.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePlayTrack(track)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleAddTrack(track)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length > 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No tracks found. Try a different search.</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Search for YouTube Music tracks</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default YouTubeMusicSearchSheet;
