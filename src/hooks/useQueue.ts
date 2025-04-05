import { useState, useEffect, useRef } from "react";
import { ref, update, set, get } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { Track } from "@/types/music";
import { socket } from "@/lib/socket";

export const useQueue = (
  roomId: string | null,
  playTrackFn: (track: Track, isRemoteChange?: boolean) => void,
  isHost: boolean
) => {
  const [queue, setQueue] = useState<Track[]>([]);
  const queueRef = useRef<Track[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    if (!roomId) return;

    const fetchQueue = async () => {
      try {
        const queueDbRef = ref(rtdb, `rooms/${roomId}/queue`);
        const snapshot = await get(queueDbRef);

        if (snapshot.exists()) {
          const queueData = snapshot.val();
          const tracksList = Object.values(queueData) as Track[];
          console.log("Fetched queue from Firebase:", tracksList);
          setQueue(tracksList);
        }
      } catch (error) {
        console.error("Error fetching queue:", error);
      }
    };

    fetchQueue();
  }, [roomId]);

  const addToQueue = (track: Track) => {
    console.log("Adding to queue:", track);
    setQueue(prev => [...prev, track]);

    if (roomId) {
      const trackRef = ref(rtdb, `rooms/${roomId}/queue/${track.id}`);
      set(trackRef, track)
        .then(() => {
          console.log("Successfully added track to Firebase queue");
        })
        .catch(error => {
          console.error("Error adding track to queue:", error);
        });
    }

    toast({
      title: "Added to queue",
      description: `${track.title} by ${track.artist} added to queue`
    });

    if (queue.length === 0 && isHost) {
      playTrackFn(track);
    }
  };

  const removeFromQueue = (trackId: string) => {
    // Only host should be able to remove from queue
    if (!isHost) {
      toast({
        title: "Not allowed",
        description: "Only the host can remove tracks from the queue",
        variant: "destructive"
      });
      return;
    }

    setQueue(prev => prev.filter(track => track.id !== trackId));

    if (roomId) {
      const trackRef = ref(rtdb, `rooms/${roomId}/queue/${trackId}`);
      set(trackRef, null);
    }
  };

  const nextTrack = (currentTrack: Track | null) => {
    if (!currentTrack || queue.length === 0) return null;

    // Only host should be able to change tracks
    if (!isHost) return null;

    const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
    console.log("Current track index:", currentIndex, "Queue length:", queue.length);

    if (currentIndex < queue.length - 1) {
      const nextTrack = queue[currentIndex + 1];
      console.log("Playing next track:", nextTrack);
      playTrackFn(nextTrack);

      if (roomId) {
        const roomRef = ref(rtdb, `rooms/${roomId}`);
        update(roomRef, { currentTrack: nextTrack })
          .then(() => {
            socket.emit("nextTrack", { roomId });
            socket.emit("trackChanged", { roomId, trackId: nextTrack.id });
          })
          .catch(error => {
            console.error("Error updating next track:", error);
          });
      }

      return nextTrack;
    } else {
      console.log("No next track available");
      return null;
    }
  };

  const prevTrack = (currentTrack: Track | null) => {
    if (!currentTrack || queue.length === 0) return null;

    // Only host should be able to change tracks
    if (!isHost) return null;

    const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
    console.log("Current track index (prev):", currentIndex);

    if (currentIndex > 0) {
      const prevTrack = queue[currentIndex - 1];
      console.log("Playing previous track:", prevTrack);
      playTrackFn(prevTrack);

      if (roomId) {
        const roomRef = ref(rtdb, `rooms/${roomId}`);
        update(roomRef, { currentTrack: prevTrack })
          .then(() => {
            socket.emit("prevTrack", { roomId });
            socket.emit("trackChanged", { roomId, trackId: prevTrack.id });
          })
          .catch(error => {
            console.error("Error updating previous track:", error);
          });
      }

      return prevTrack;
    } else {
      console.log("No previous track available");
      return null;
    }
  };

  const addSongByUrl = async (
    url: string,
    title?: string,
    artist?: string
  ): Promise<boolean> => {
    if (!url || !url.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid audio URL",
        variant: "destructive"
      });
      return false;
    }

    const suggestedTitle =
      title || url.split("/").pop()?.split(".")[0] || "Unknown Track";
    const trackArtist = artist || "Unknown Artist";

    const newTrack: Track = {
      id: `track_${Date.now()}`,
      title: suggestedTitle,
      artist: trackArtist,
      album: "Added via URL",
      coverUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/ca/CD-ROM.png",
      audioUrl: url,
      duration: 180
    };

    addToQueue(newTrack);

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
