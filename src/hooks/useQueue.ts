// useQueue.ts

import { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
import { ref, update, set, onValue } from "firebase/database"; // Changed get to onValue
import { rtdb } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { Track } from "@/types/music";
// Removed socket import if not used directly here for track changes (handled by parent listener)
// import { socket } from "@/lib/socket";

// playTrackFn is NO LONGER CALLED directly by this hook for next/prev/add.
// It's kept in args IF the parent component needs it for other reasons,
// but the core logic here now relies on updating Firebase currentTrack.
// Consider removing playTrackFn from args if parent solely relies on Firebase listener.
export const useQueue = (roomId: string | null, isHost: boolean) => {
  const [queue, setQueue] = useState<Track[]>([]);
  const queueRef = useRef<Track[]>([]); // Ref to compare updates

  // Keep queueRef updated
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // --- Real-time Queue Listener ---
  useEffect(() => {
    if (!roomId) {
        setQueue([]); // Clear queue if no room ID
        return;
    };

    const queueDbRef = ref(rtdb, `rooms/${roomId}/queue`);

    // Use onValue for real-time updates
    const unsubscribe = onValue(queueDbRef, (snapshot) => {
        let tracksList: Track[] = [];
        if (snapshot.exists()) {
            const queueData = snapshot.val();
            // Firebase objects don't guarantee order, convert to array
            // You might need a more robust sorting mechanism if order is critical
            // and not implicitly handled by how you add items (e.g., using push keys)
            tracksList = Object.values(queueData || {}) as Track[];
            console.log("Real-time queue update from Firebase:", tracksList);
        } else {
            console.log("Queue is empty in Firebase.");
        }

        // Update state only if data has actually changed
        if (JSON.stringify(tracksList) !== JSON.stringify(queueRef.current)) {
            setQueue(tracksList);
        }
    }, (error) => {
        console.error("Error listening to queue:", error);
        toast({ title: "Queue Error", description: "Could not sync queue.", variant: "destructive" });
    });

    // Cleanup function
    return () => {
        console.log("Unsubscribing from queue listener for room:", roomId);
        unsubscribe();
    }

  }, [roomId]); // Re-run when roomId changes

  // --- Function to update currentTrack in Firebase ---
  // Encapsulate Firebase update logic
  const updateFirebaseCurrentTrack = useCallback((track: Track | null) => {
    if (!roomId) return;
    console.log("Attempting to update Firebase currentTrack to:", track?.id ?? 'null');
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    update(roomRef, { currentTrack: track }) // Send null to clear
      .then(() => {
        console.log("Successfully updated Firebase currentTrack.");
        // Socket emission might happen here OR in the parent component's listener
        // socket.emit("trackChanged", { roomId, trackId: track?.id });
      })
      .catch(error => {
        console.error("Error updating Firebase currentTrack:", error);
        toast({ title: "Sync Error", description: "Could not update current track.", variant: "destructive" });
      });
  }, [roomId]);


  const addToQueue = useCallback((track: Track) => {
    if (!roomId) return;

    console.log("Adding to queue:", track);
    // Optimistic UI update (listener will confirm)
    // setQueue(prev => [...prev, track]); // Let the listener handle state updates

    const newTrackRef = ref(rtdb, `rooms/${roomId}/queue/${track.id}`);
    set(newTrackRef, track)
      .then(() => {
        console.log("Successfully added track to Firebase queue");
        toast({
          title: "Added to queue",
          description: `${track.title} by ${track.artist} added to queue`
        });

        // --- MODIFIED: Check if *Firebase* queue was empty before adding ---
        // This is tricky without knowing the exact state *before* the set.
        // Best approach: Let the host's player component check if currentTrack is null
        // AFTER adding, and if so, call updateFirebaseCurrentTrack(track).
        // Avoid direct playback call here.
        // Example logic (might need adjustment based on parent component):
        // if (queueRef.current.length === 0 && isHost) {
        //   console.log("Queue was empty, setting added track as current.");
        //   updateFirebaseCurrentTrack(track);
        // }

      })
      .catch(error => {
        console.error("Error adding track to Firebase queue:", error);
        toast({ title: "Error", description: "Could not add track to queue.", variant: "destructive" });
        // Revert optimistic update if needed
        // setQueue(prev => prev.filter(t => t.id !== track.id));
      });
  }, [roomId, isHost, updateFirebaseCurrentTrack]); // Added dependencies

  const removeFromQueue = useCallback((trackId: string) => {
    if (!isHost) {
      toast({ title: "Not allowed", description: "Only the host can remove tracks.", variant: "destructive" });
      return;
    }
    if (!roomId) return;

    console.log("Removing track from queue:", trackId);
    // Optimistic update handled by listener

    const trackRef = ref(rtdb, `rooms/${roomId}/queue/${trackId}`);
    set(trackRef, null)
     .then(() => {
        console.log("Successfully removed track from Firebase queue");
        toast({ title: "Track Removed", description: "Track removed from queue." });
        // Check if the removed track was the current one
        // This logic likely belongs in the parent component's listener for currentTrack
     })
     .catch(error => {
        console.error("Error removing track from Firebase queue:", error);
        toast({ title: "Error", description: "Could not remove track.", variant: "destructive" });
     });
  }, [roomId, isHost]); // Added dependencies

  const nextTrack = useCallback((currentTrack: Track | null) => {
    if (!isHost) return null; // Only host controls
    if (!currentTrack || queue.length === 0) return null; // Need current track and queue items

    const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
    console.log("Current track index:", currentIndex, "Queue length:", queue.length);

    if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      const nextTrack = queue[currentIndex + 1];
      console.log("Setting next track in Firebase:", nextTrack);
      // --- MODIFIED: Only update Firebase ---
      updateFirebaseCurrentTrack(nextTrack);
      return nextTrack; // Return optimistically
    } else {
      console.log("No next track available or current track not found in queue.");
      // Optionally clear current track if at end of queue
      // updateFirebaseCurrentTrack(null);
      return null;
    }
  }, [isHost, queue, updateFirebaseCurrentTrack]); // Added dependencies

  const prevTrack = useCallback((currentTrack: Track | null) => {
    if (!isHost) return null; // Only host controls
    if (!currentTrack || queue.length === 0) return null; // Need current track and queue items

    const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
    console.log("Current track index (prev):", currentIndex);

    if (currentIndex > 0) {
      const prevTrack = queue[currentIndex - 1];
      console.log("Setting previous track in Firebase:", prevTrack);
      // --- MODIFIED: Only update Firebase ---
      updateFirebaseCurrentTrack(prevTrack);
      return prevTrack; // Return optimistically
    } else {
      console.log("No previous track available.");
      return null;
    }
  }, [isHost, queue, updateFirebaseCurrentTrack]); // Added dependencies

  // addSongByUrl remains largely the same, calls addToQueue which is now modified
  const addSongByUrl = useCallback(async (url: string, title?: string, artist?: string): Promise<boolean> => {
    if (!url || !url.trim()) {
      toast({ title: "Invalid URL", description: "Please enter a valid audio URL", variant: "destructive" });
      return false;
    }
    // Basic validation for common audio types (optional)
    if (!/\.(mp3|wav|ogg|aac|m4a)$/i.test(url)) {
        console.warn("URL might not be a direct audio link:", url);
        // Allow adding anyway, but maybe show a warning toast?
    }

    const suggestedTitle = title || url.split('/').pop()?.split('?')[0].split('.')[0] || "Unknown Track";
    const trackArtist = artist || "Unknown Artist";

    const newTrack: Track = {
      id: `urltrack_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // More unique ID
      title: suggestedTitle,
      artist: trackArtist,
      album: "Added via URL",
      coverUrl: "/images/default-cover.png", // Use a local default image
      audioUrl: url,
      duration: 0 // Duration might be unknown until loaded
    };

    addToQueue(newTrack); // Calls the modified addToQueue

    // Toast is now handled inside addToQueue's success case
    // toast({ title: "Song added", description: `Added "${suggestedTitle}" to the queue` });

    return true;
  }, [addToQueue]); // Added dependency

  return {
    queue,
    // setQueue, // No longer needed externally if managed by listener
    addToQueue,
    removeFromQueue,
    nextTrack,
    prevTrack,
    addSongByUrl,
    // Expose updateFirebaseCurrentTrack if parent needs it for other scenarios (like starting playback when queue was empty)
    // updateFirebaseCurrentTrack
  };
};
