import { useState, useEffect, useRef } from "react";
import { ref, update, set, get, remove } from "firebase/database";
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
      remove(trackRef)
        .then(() => {
          console.log(`Track with ID ${trackId} removed from Firebase queue`);
        })
        .catch(error => {
          console.error("Error removing track from queue:", error);
        });
    }

    toast({
      title: "Removed from queue",
      description: `Track has been removed from the queue`
    });
  };

  return {
    queue,
    addToQueue,
    removeFromQueue
  };
};
