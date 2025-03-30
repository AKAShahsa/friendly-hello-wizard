
import { useState } from "react";
import { ref, update, set } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { Track } from "@/types/music";
import { socket } from "@/lib/socket";

export const useQueue = (roomId: string | null, playTrackFn: (track: Track) => void) => {
  const [queue, setQueue] = useState<Track[]>([]);

  const addToQueue = (track: Track) => {
    // Add track to local queue
    setQueue(prev => [...prev, track]);
    
    // If room exists, update Firebase
    if (roomId) {
      const queueRef = ref(rtdb, `rooms/${roomId}/queue/${track.id}`);
      set(queueRef, track);
    }
    
    toast({
      title: "Added to queue",
      description: `${track.title} by ${track.artist} added to queue`
    });
  };

  const removeFromQueue = (trackId: string) => {
    setQueue(prev => prev.filter(track => track.id !== trackId));
    
    if (roomId) {
      const trackRef = ref(rtdb, `rooms/${roomId}/queue/${trackId}`);
      set(trackRef, null);
    }
  };

  const nextTrack = (currentTrack: Track | null) => {
    if (!currentTrack || queue.length === 0) return;
    
    const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
    if (currentIndex < queue.length - 1) {
      playTrackFn(queue[currentIndex + 1]);
      
      if (roomId) {
        socket.emit("nextTrack", { roomId });
      }
    }
  };

  const prevTrack = (currentTrack: Track | null) => {
    if (!currentTrack || queue.length === 0) return;
    
    const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrackFn(queue[currentIndex - 1]);
      
      if (roomId) {
        socket.emit("prevTrack", { roomId });
      }
    }
  };

  const addSongByUrl = async (url: string, title?: string, artist?: string): Promise<boolean> => {
    if (!url || !url.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid audio URL",
        variant: "destructive"
      });
      return false;
    }

    const suggestedTitle = title || url.split('/').pop()?.split('.')[0] || "Unknown Track";
    const trackArtist = artist || "Unknown Artist";

    const newTrack: Track = {
      id: `track_${Date.now()}`,
      title: suggestedTitle,
      artist: trackArtist,
      album: "Added via URL",
      coverUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ca/CD-ROM.png",
      audioUrl: url,
      duration: 180
    };

    addToQueue(newTrack);
    
    // If no tracks are playing, start playing this one
    if (queue.length === 0) {
      playTrackFn(newTrack);
    }
    
    toast({
      title: "Song added",
      description: `Added "${suggestedTitle}" to the queue`
    });

    return true;
  };

  return {
    queue,
    setQueue,
    addToQueue,
    removeFromQueue,
    nextTrack,
    prevTrack,
    addSongByUrl
  };
};
