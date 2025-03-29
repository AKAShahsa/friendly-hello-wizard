
import React from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Heart, Smile } from "lucide-react";

interface ReactionButtonsProps {
  reactions: {
    thumbsUp: number;
    heart: number;
    smile: number;
  };
  sendReaction: (type: "thumbsUp" | "heart" | "smile") => void;
}

const ReactionButtons: React.FC<ReactionButtonsProps> = ({ reactions, sendReaction }) => {
  return (
    <div className="flex justify-center gap-4 mb-6">
      <Button 
        variant="outline" 
        onClick={() => sendReaction("thumbsUp")}
        className="flex flex-col items-center"
      >
        <ThumbsUp className="h-5 w-5" />
        <span className="text-xs mt-1">{reactions.thumbsUp}</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={() => sendReaction("heart")}
        className="flex flex-col items-center"
      >
        <Heart className="h-5 w-5" />
        <span className="text-xs mt-1">{reactions.heart}</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={() => sendReaction("smile")}
        className="flex flex-col items-center"
      >
        <Smile className="h-5 w-5" />
        <span className="text-xs mt-1">{reactions.smile}</span>
      </Button>
    </div>
  );
};

export default ReactionButtons;
