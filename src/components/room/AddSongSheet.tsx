
import React, { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AddSongSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  addSongByUrl: (url: string, title?: string, artist?: string) => Promise<boolean>;
}

const AddSongSheet: React.FC<AddSongSheetProps> = ({ isOpen, onOpenChange, addSongByUrl }) => {
  const [songUrl, setSongUrl] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (songUrl.trim()) {
      const success = await addSongByUrl(songUrl, songTitle.trim() || undefined, songArtist.trim() || undefined);
      if (success) {
        setSongUrl("");
        setSongTitle("");
        setSongArtist("");
        onOpenChange(false);
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="h-full flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Add Song by URL</h2>
          <form onSubmit={handleAddSong} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="song-url">Audio URL (required)</Label>
              <Input
                id="song-url"
                value={songUrl}
                onChange={(e) => setSongUrl(e.target.value)}
                placeholder="https://example.com/song.mp3"
                className="flex-1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="song-title">Song Title (optional)</Label>
              <Input
                id="song-title"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Enter song title"
                className="flex-1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="song-artist">Artist Name (optional)</Label>
              <Input
                id="song-artist"
                value={songArtist}
                onChange={(e) => setSongArtist(e.target.value)}
                placeholder="Enter artist name"
                className="flex-1"
              />
            </div>
            
            <div className="pt-4">
              <Button type="submit" className="w-full">
                Add to Queue
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddSongSheet;
