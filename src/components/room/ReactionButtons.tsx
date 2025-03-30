
import React from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Heart, Smile } from "lucide-react";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

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

  useEffect(() => {
    if (!lastTriggered) return;

    // Different effects for different reactions
    if (lastTriggered === "thumbsUp") {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4285F4', '#0F9D58']
      });
    } else if (lastTriggered === "heart") {
      confetti({
        particleCount: 60,
        spread: 100,
        shapes: ['circle'],
        colors: ['#ff0000', '#ff69b4', '#ff1493']
      });
    } else if (lastTriggered === "smile") {
      confetti({
        particleCount: 100,
        spread: 120,
        gravity: 0.7,
        colors: ['#FFD700', '#FFA500', '#FF8C00']
      });
    }

    // Reset after animation
    const timer = setTimeout(() => {
      setLastTriggered(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [lastTriggered]);

  const handleReaction = (type: "thumbsUp" | "heart" | "smile") => {
    sendReaction(type);
    setLastTriggered(type);
  };

  return (
    <div className="flex justify-center gap-4 mb-6">
      <Button 
        variant="outline" 
        onClick={() => handleReaction("thumbsUp")}
        className="flex flex-col items-center"
      >
        <ThumbsUp className="h-5 w-5" />
        <span className="text-xs mt-1">{reactions.thumbsUp}</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={() => handleReaction("heart")}
        className="flex flex-col items-center"
      >
        <Heart className="h-5 w-5" />
        <span className="text-xs mt-1">{reactions.heart}</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={() => handleReaction("smile")}
        className="flex flex-col items-center"
      >
        <Smile className="h-5 w-5" />
        <span className="text-xs mt-1">{reactions.smile}</span>
      </Button>
    </div>
  );
};

export default ReactionButtons;
