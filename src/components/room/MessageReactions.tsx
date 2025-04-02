
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, ThumbsUp, Laugh, Smile, Plus } from "lucide-react";
import confetti from "canvas-confetti";

interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onAddReaction: (emoji: string) => void;
  messageId: string;
}

const quickReactions = [
  { emoji: "👍", icon: <ThumbsUp className="h-4 w-4" /> },
  { emoji: "❤️", icon: <Heart className="h-4 w-4" /> },
  { emoji: "😂", icon: <Laugh className="h-4 w-4" /> },
  { emoji: "😊", icon: <Smile className="h-4 w-4" /> },
  { emoji: "👏", icon: <span className="text-sm">👏</span> },
  { emoji: "🙌", icon: <span className="text-sm">🙌</span> },
];

const MessageReactions: React.FC<MessageReactionsProps> = ({ 
  reactions, 
  onAddReaction,
  messageId
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [lastTriggeredEmoji, setLastTriggeredEmoji] = useState<string | null>(null);
  const currentUserId = localStorage.getItem("userId") || "";
  
  // Particle effects for reactions
  const triggerParticleEffect = (emoji: string) => {
    // Create different effects based on emoji
    const origin = { x: Math.random() * 0.3 + 0.3, y: Math.random() * 0.3 + 0.5 };
    
    if (emoji === "👍") {
      confetti({
        particleCount: 30,
        spread: 50,
        origin,
        colors: ['#4285F4', '#0F9D58']
      });
    } else if (emoji === "❤️") {
      confetti({
        particleCount: 40,
        spread: 70,
        shapes: ['circle'],
        origin,
        colors: ['#ff0000', '#ff69b4', '#ff1493']
      });
    } else if (emoji === "😂" || emoji === "😊") {
      confetti({
        particleCount: 50,
        spread: 90,
        origin,
        gravity: 0.7,
        colors: ['#FFD700', '#FFA500', '#FF8C00']
      });
    } else if (emoji === "👏" || emoji === "🙌") {
      confetti({
        particleCount: 60,
        spread: 100,
        origin,
        colors: ['#9c27b0', '#673ab7', '#3f51b5']
      });
    } else {
      // Default confetti for other emojis
      confetti({
        particleCount: 40,
        spread: 80,
        origin,
      });
    }
  };
  
  const handleReactionClick = (reaction: MessageReaction) => {
    // This is a key part - always trigger the reaction, regardless of previous state
    // This allows re-triggering reactions and ensures broadcasting happens
    setLastTriggeredEmoji(reaction.emoji);
    onAddReaction(reaction.emoji);
    triggerParticleEffect(reaction.emoji);
  };
  
  const userHasReacted = (userIds: string[]) => {
    return userIds.includes(currentUserId);
  };
  
  // Clear last triggered emoji after animation
  useEffect(() => {
    if (lastTriggeredEmoji) {
      const timer = setTimeout(() => {
        setLastTriggeredEmoji(null);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [lastTriggeredEmoji]);
  
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {reactions.map((reaction, index) => (
        <Button
          key={`${messageId}-${reaction.emoji}-${index}`}
          variant="ghost"
          size="sm"
          className={`h-6 px-1.5 py-0 text-xs rounded-full shadow-sm cursor-pointer hover:scale-110 transition-all ${
            userHasReacted(reaction.userIds) ? 'bg-secondary/90' : 'bg-secondary/50'
          } hover:bg-secondary/80 active:scale-95 ${lastTriggeredEmoji === reaction.emoji ? 'animate-bounce' : ''}`}
          onClick={() => handleReactionClick(reaction)}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </Button>
      ))}
      
      <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 rounded-full bg-secondary/30 hover:bg-secondary/60 cursor-pointer hover:scale-110 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" sideOffset={0}>
          <div className="flex flex-wrap gap-1 justify-center">
            {quickReactions.map(({ emoji, icon }) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-secondary/60 cursor-pointer hover:scale-110 active:scale-95"
                onClick={() => {
                  setLastTriggeredEmoji(emoji);
                  onAddReaction(emoji);
                  triggerParticleEffect(emoji);
                  setShowReactionPicker(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MessageReactions;
