
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, ThumbsUp, Laugh, Smile, Plus } from "lucide-react";

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
  const currentUserId = localStorage.getItem("userId") || "";
  
  const handleReactionClick = (reaction: MessageReaction) => {
    // If user already reacted with this emoji, don't add it again
    if (reaction.userIds.includes(currentUserId)) return;
    
    onAddReaction(reaction.emoji);
  };
  
  const userHasReacted = (userIds: string[]) => {
    return userIds.includes(currentUserId);
  };
  
  return (
    <div className="flex flex-wrap items-center gap-1">
      {reactions.map((reaction, index) => (
        <Button
          key={`${messageId}-${reaction.emoji}-${index}`}
          variant="ghost"
          size="sm"
          className={`h-6 px-1.5 py-0 text-xs rounded-full shadow-sm ${
            userHasReacted(reaction.userIds) ? 'bg-secondary/90' : 'bg-secondary/50'
          } hover:bg-secondary/80 transition-all`}
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
            className="h-6 w-6 p-0 rounded-full bg-secondary/30 hover:bg-secondary/60"
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
                className="h-8 w-8 p-0 rounded-full hover:bg-secondary/60"
                onClick={() => {
                  onAddReaction(emoji);
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
