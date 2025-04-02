
import React from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Heart, Smile, Laugh } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { toast } from "@/hooks/use-toast";
import { socket, broadcastReaction, getCurrentRoomId } from "@/lib/socket";

interface ReactionButtonsProps {
  reactions: {
    thumbsUp: number;
    heart: number;
    smile: number;
  };
  sendReaction: (type: "thumbsUp" | "heart" | "smile") => void;
}

const ReactionButtons: React.FC<ReactionButtonsProps> = ({ reactions, sendReaction }) => {
  const [lastTriggered, setLastTriggered] = useState<"thumbsUp" | "heart" | "smile" | null>(null);
  const [remoteReactions, setRemoteReactions] = useState<{
    type: "thumbsUp" | "heart" | "smile";
    userId: string;
    userName: string;
    timestamp: number;
  }[]>([]);

  // Reference to avoid recreating handlers on each render
  const lastReactionsRef = useRef(reactions);
  
  useEffect(() => {
    lastReactionsRef.current = reactions;
  }, [reactions]);

  // Function to trigger confetti effects
  const triggerConfettiEffect = (type: "thumbsUp" | "heart" | "smile", fromRemote = false, userId?: string) => {
    // Different effects for different reactions
    if (type === "thumbsUp") {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4285F4', '#0F9D58']
      });
    } else if (type === "heart") {
      confetti({
        particleCount: 60,
        spread: 100,
        shapes: ['circle'],
        colors: ['#ff0000', '#ff69b4', '#ff1493']
      });
    } else if (type === "smile") {
      confetti({
        particleCount: 100,
        spread: 120,
        gravity: 0.7,
        colors: ['#FFD700', '#FFA500', '#FF8C00']
      });
    }

    // Only show toast for remote reactions from other users
    if (fromRemote && userId !== localStorage.getItem("userId")) {
      const reaction = remoteReactions.find(r => r.type === type && r.userId === userId);
      if (reaction) {
        toast({
          title: `${reaction.userName} reacted`,
          description: `Sent a ${type === "thumbsUp" ? "👍" : type === "heart" ? "❤️" : "😊"}`,
          duration: 2000
        });
      }
    }
  };

  useEffect(() => {
    // Listen for remote reactions
    const handleRemoteReaction = (data: any) => {
      console.log("Received remote reaction:", data);
      if (data.roomId === getCurrentRoomId()) {
        setRemoteReactions(prev => [
          ...prev.filter(r => Date.now() - r.timestamp < 10000), // Keep only recent reactions
          {
            type: data.reactionType,
            userId: data.userId,
            userName: data.userName || "Someone",
            timestamp: data.timestamp || Date.now()
          }
        ]);

        // Trigger the confetti effect for all users (both sender and receivers)
        triggerConfettiEffect(data.reactionType, true, data.userId);
      }
    };

    socket.on("reactionEffect", handleRemoteReaction);

    return () => {
      socket.off("reactionEffect", handleRemoteReaction);
    };
  }, []);

  useEffect(() => {
    if (!lastTriggered) return;

    // No need to trigger local confetti here, as it will be handled by the socket event
    // This prevents double effects for the sender

    // Reset after animation
    const timer = setTimeout(() => {
      setLastTriggered(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [lastTriggered]);

  const handleReaction = (type: "thumbsUp" | "heart" | "smile") => {
    console.log(`Sending reaction: ${type}`);
    try {
      sendReaction(type);
      setLastTriggered(type);
      
      // Apply optimistic update to ensure the UI updates immediately
      const reactionElement = document.querySelector(`#reaction-count-${type}`);
      if (reactionElement) {
        const currentCount = parseInt(reactionElement.textContent || "0");
        reactionElement.textContent = (currentCount + 1).toString();
      }

      // Broadcast the reaction to all users in the room
      const roomId = getCurrentRoomId();
      const userId = localStorage.getItem("userId") || "";
      const userName = localStorage.getItem("userName") || "Anonymous";
      if (roomId) {
        broadcastReaction(roomId, type, userId, userName);
      }
    } catch (error) {
      console.error(`Error sending ${type} reaction:`, error);
      toast({
        title: "Reaction Error",
        description: "Failed to send your reaction. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex justify-center gap-4 mb-6">
      <Button 
        variant="outline" 
        onClick={() => handleReaction("thumbsUp")}
        className="flex flex-col items-center"
      >
        <ThumbsUp className="h-5 w-5" />
        <span id="reaction-count-thumbsUp" className="text-xs mt-1">{reactions.thumbsUp || 0}</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={() => handleReaction("heart")}
        className="flex flex-col items-center"
      >
        <Heart className="h-5 w-5" />
        <span id="reaction-count-heart" className="text-xs mt-1">{reactions.heart || 0}</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={() => handleReaction("smile")}
        className="flex flex-col items-center"
      >
        <Smile className="h-5 w-5" />
        <span id="reaction-count-smile" className="text-xs mt-1">{reactions.smile || 0}</span>
      </Button>
    </div>
  );
};

export default ReactionButtons;
