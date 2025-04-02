
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Heart, ThumbsUp, Laugh, Frown, Check } from "lucide-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const emojiGroups = [
  {
    name: "Smileys",
    emojis: ["😊", "😂", "🥰", "😍", "😎", "🙄", "😴", "🤔", "😜", "😇"]
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "👌", "🤘", "👋"]
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💗", "💓", "💕"]
  },
  {
    name: "Animals",
    emojis: ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯"]
  },
  {
    name: "Food",
    emojis: ["🍎", "🍕", "🍔", "🍟", "🍦", "🍩", "🍪", "🍫", "🥤", "🍷"]
  }
];

const quickEmojis = ["👍", "❤️", "😊", "😂", "🎉", "🔥", "👏", "🙏"];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect }) => {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);
  
  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (!term) {
      setFilteredEmojis([]);
      return;
    }
    
    // Simple search through all emoji groups
    const allEmojis: string[] = [];
    emojiGroups.forEach(group => allEmojis.push(...group.emojis));
    
    // For demo purposes, this is a very simple filter
    // In a real app, you would want to use a more sophisticated search
    // that includes emoji descriptions/names
    setFilteredEmojis(allEmojis);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end" sideOffset={10}>
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search emoji..."
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          {/* Quick select row */}
          <div className="flex p-2 gap-1 flex-wrap border-b">
            {quickEmojis.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
          
          {/* Categories */}
          {searchTerm === "" && (
            <>
              <div className="flex border-b">
                {emojiGroups.map((group, index) => (
                  <Button
                    key={group.name}
                    variant="ghost"
                    size="sm"
                    className={`flex-1 rounded-none p-1 ${activeGroup === index ? 'bg-secondary' : ''}`}
                    onClick={() => setActiveGroup(index)}
                  >
                    {index === 0 ? <Smile className="h-4 w-4" /> :
                     index === 1 ? <ThumbsUp className="h-4 w-4" /> : 
                     index === 2 ? <Heart className="h-4 w-4" /> :
                     index === 3 ? <Laugh className="h-4 w-4" /> :
                     <Frown className="h-4 w-4" />}
                  </Button>
                ))}
              </div>
              
              <div className="p-2 h-48 overflow-y-auto">
                <div className="grid grid-cols-7 gap-1">
                  {emojiGroups[activeGroup].emojis.map(emoji => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Search results */}
          {searchTerm !== "" && (
            <div className="p-2 h-48 overflow-y-auto">
              {filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-7 gap-1">
                  {filteredEmojis.map(emoji => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No emojis found
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
