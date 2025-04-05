
import React, { useRef, useEffect, useState, memo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Bot, ThumbsUp, Heart, Smile } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChatMessage } from "@/types/music";
import { toast } from "@/hooks/use-toast";

interface ChatSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  messages: ChatMessage[];
  sendChatMessage: (message: string) => void;
}

// Using memo to prevent unnecessary re-renders
const ChatSheet: React.FC<ChatSheetProps> = memo(({ isOpen, onOpenChange, messages, sendChatMessage }) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showAIPopover, setShowAIPopover] = useState(false);
  const [messageReactions, setMessageReactions] = useState<{[messageIndex: number]: {[type: string]: boolean}}>({}); 
  
  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(message);
      setMessage("");
    }
  };

  const handleAIAssistant = () => {
    setMessage((prev) => {
      // Only prepend @AI if it's not already there
      if (!prev.trim().startsWith('@AI')) {
        return '@AI ' + prev;
      }
      return prev;
    });
    setShowAIPopover(false);
  };
  
  const handleMessageReaction = (messageIndex: number, reactionType: string) => {
    // Update local state for immediate visual feedback
    setMessageReactions(prev => ({
      ...prev,
      [messageIndex]: {
        ...(prev[messageIndex] || {}),
        [reactionType]: true
      }
    }));
    
    // Provide visual feedback of the reaction
    toast({
      title: "Reaction sent",
      description: `You reacted to the message with ${reactionType === "thumbsUp" ? "👍" : reactionType === "heart" ? "❤️" : "😊"}`,
      duration: 1000
    });
    
    // Animate the reaction button
    const buttonElement = document.querySelector(`#message-reaction-${messageIndex}-${reactionType}`);
    if (buttonElement) {
      buttonElement.classList.add('text-primary');
      buttonElement.classList.add('animate-pulse');
      
      // Add confetti effect
      const rect = buttonElement.getBoundingClientRect();
      const x = (rect.left + rect.right) / 2 / window.innerWidth;
      const y = (rect.top + rect.bottom) / 2 / window.innerHeight;
      
      window.confetti({
        particleCount: 30,
        spread: 70,
        origin: { x, y },
        colors: reactionType === 'heart' ? ['#ff0000', '#ff69b4'] : 
                reactionType === 'smile' ? ['#ffd700', '#ffa500'] : 
                ['#4285F4', '#0F9D58']
      });
      
      setTimeout(() => {
        buttonElement.classList.remove('animate-pulse');
      }, 1000);
    }
  };

  // Function to format message text with line breaks, URLs as links, and HTML formatting
  const formatMessageText = (text: string) => {
    // First, escape any HTML to prevent XSS
    const escapedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Convert Markdown-style formatting to HTML tags
    let formattedText = escapedText;
    
    // Bold: *text* or **text** -> <b>text</b>
    formattedText = formattedText.replace(/\*\*(.*?)\*\*|\*(.*?)\*/g, (match, p1, p2) => {
      const content = p1 || p2;
      return `<b>${content}</b>`;
    });
    
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formattedText = formattedText.replace(urlRegex, 
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${url}</a>`
    );
    
    // Convert Markdown-style bullet points (* item) to HTML list items with proper spacing
    let textWithBullets = formattedText;
    
    // Handle bullet points with line breaks
    textWithBullets = textWithBullets.replace(/\n\*\s+([^\n]+)/g, (match, content) => {
      return `<br/><span class="flex ml-2"><span class="mr-2">•</span>${content}</span>`;
    });
    
    // Handle standalone bullet points at the beginning of text
    textWithBullets = textWithBullets.replace(/^\*\s+([^\n]+)/g, (match, content) => {
      return `<span class="flex ml-2"><span class="mr-2">•</span>${content}</span>`;
    });
    
    // Convert line breaks to <br> tags (after handling bullet points)
    const textWithLineBreaks = textWithBullets.replace(/\n/g, '<br />');
    
    return { __html: textWithLineBreaks };
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col p-0">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Chat</h2>
          </div>
          <ScrollArea className="flex-1 p-4">
            {messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={`${msg.userId}-${msg.timestamp}-${index}`}
                    className={`flex items-start gap-3 ${msg.isAI || msg.userId === 'ai-assistant' 
                      ? 'bg-secondary/30 p-3 rounded-lg' 
                      : 'border-b pb-3'}`}
                  >
                    <Avatar className={`h-8 w-8 ${msg.isAI || msg.userId === 'ai-assistant' ? 'bg-primary/20' : ''}`}>
                      <AvatarFallback className="text-xs">
                        {msg.isAI || msg.userId === 'ai-assistant' ? 'AI' : msg.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${msg.isAI || msg.userId === 'ai-assistant' ? 'text-primary' : ''}`}>
                          {msg.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div 
                        className="mt-1 whitespace-pre-wrap break-words" 
                        dangerouslySetInnerHTML={formatMessageText(msg.text)}
                      />
                      
                      {/* Message reactions */}
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          id={`message-reaction-${index}-thumbsUp`}
                          onClick={() => handleMessageReaction(index, 'thumbsUp')}
                          className={`transition-colors ${messageReactions[index]?.thumbsUp ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          id={`message-reaction-${index}-heart`}
                          onClick={() => handleMessageReaction(index, 'heart')}
                          className={`transition-colors ${messageReactions[index]?.heart ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                        >
                          <Heart className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          id={`message-reaction-${index}-smile`}
                          onClick={() => handleMessageReaction(index, 'smile')}
                          className={`transition-colors ${messageReactions[index]?.smile ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No messages yet</p>
              </div>
            )}
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Popover open={showAIPopover} onOpenChange={setShowAIPopover}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 text-xs"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    AI Assistant
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Ask AI Assistant</h4>
                    <p className="text-xs text-muted-foreground">
                      Click the button below to insert @AI prefix or type @AI in your message to ask the AI assistant.
                    </p>
                    <Button 
                      onClick={handleAIAssistant} 
                      type="button" 
                      className="w-full mt-2"
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      Use AI Assistant
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message... (use @AI for AI assistant)"
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
});

ChatSheet.displayName = "ChatSheet";

export default ChatSheet;
