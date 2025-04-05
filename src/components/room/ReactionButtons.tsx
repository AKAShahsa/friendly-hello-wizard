
import React from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Heart, Smile } from "lucide-react";
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
  const reactionsCountRef = useRef({
    thumbsUp: reactions.thumbsUp || 0,
    heart: reactions.heart || 0,
    smile: reactions.smile || 0
  });
  
  useEffect(() => {
    lastReactionsRef.current = reactions;
    reactionsCountRef.current = {
      thumbsUp: reactions.thumbsUp || 0,
      heart: reactions.heart || 0,
      smile: reactions.smile || 0
    };
    
    // Update the display when we receive updated reactions from database
    const thumbsUpElement = document.querySelector(`#reaction-count-thumbsUp`);
    const heartElement = document.querySelector(`#reaction-count-heart`);
    const smileElement = document.querySelector(`#reaction-count-smile`);
    
    if (thumbsUpElement) thumbsUpElement.textContent = (reactions.thumbsUp || 0).toString();
    if (heartElement) heartElement.textContent = (reactions.heart || 0).toString();
    if (smileElement) smileElement.textContent = (reactions.smile || 0).toString();
  }, [reactions]);

  useEffect(() => {
    // Debug the reactions data
    console.log("Current reactions state:", reactions);
  }, [reactions]);

  const triggerConfettiEffect = (type: "thumbsUp" | "heart" | "smile", fromRemote = false) => {
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

    // Show toast if remote reaction
    if (fromRemote) {
      const reaction = remoteReactions.find(r => r.type === type);
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
      if (data.roomId === getCurrentRoomId() && data.userId !== localStorage.getItem("userId")) {
        setRemoteReactions(prev => [
          ...prev.filter(r => Date.now() - r.timestamp < 10000), // Keep only recent reactions
          {
            type: data.reactionType,
            userId: data.userId,
            userName: data.userName || "Someone",
            timestamp: data.timestamp || Date.now()
          }
        ]);

        // Trigger the confetti effect
        triggerConfettiEffect(data.reactionType, true);
      }
    };

    socket.on("reactionEffect", handleRemoteReaction);

    return () => {
      socket.off("reactionEffect", handleRemoteReaction);
    };
  }, []);

  useEffect(() => {
    if (!lastTriggered) return;

    // Trigger confetti for local reaction
    triggerConfettiEffect(lastTriggered);

    // Reset after animation
    const timer = setTimeout(() => {
      setLastTriggered(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [lastTriggered]);

  const handleReaction = (type: "thumbsUp" | "heart" | "smile") => {
    console.log(`Sending reaction: ${type}`);
    try {
      // Add visual feedback animation
      const buttonElement = document.querySelector(`#reaction-button-${type}`);
      if (buttonElement) {
        buttonElement.classList.add('animate-bounce');
        setTimeout(() => {
          buttonElement.classList.remove('animate-bounce');
        }, 500);
      }
      
      // Send the reaction to the database through the parent component
      sendReaction(type);
      setLastTriggered(type);
      
      // Don't update UI here - let the database update flow through
      // to ensure consistency across all clients
      
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
        id="reaction-button-thumbsUp"
        variant="outline" 
        onClick={() => handleReaction("thumbsUp")}
        className="flex flex-col items-center relative overflow-hidden hover:bg-primary/10 active:scale-95 transition-all"
      >
        <ThumbsUp className="h-5 w-5" />
        <span id="reaction-count-thumbsUp" className="text-xs mt-1">{reactions.thumbsUp || 0}</span>
      </Button>
      <Button 
        id="reaction-button-heart"
        variant="outline" 
        onClick={() => handleReaction("heart")}
        className="flex flex-col items-center relative overflow-hidden hover:bg-primary/10 active:scale-95 transition-all"
      >
        <Heart className="h-5 w-5" />
        <span id="reaction-count-heart" className="text-xs mt-1">{reactions.heart || 0}</span>
      </Button>
      <Button 
        id="reaction-button-smile"
        variant="outline" 
        onClick={() => handleReaction("smile")}
        className="flex flex-col items-center relative overflow-hidden hover:bg-primary/10 active:scale-95 transition-all"
      >
        <Smile className="h-5 w-5" />
        <span id="reaction-count-smile" className="text-xs mt-1">{reactions.smile || 0}</span>
      </Button>
    </div>
  );
};

export default ReactionButtons;
