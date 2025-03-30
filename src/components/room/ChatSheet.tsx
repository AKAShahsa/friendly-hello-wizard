
import React, { useRef, useEffect, useState, memo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/music";

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
                    className="flex items-start gap-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {msg.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{msg.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1">{msg.text}</p>
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
          <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
});

ChatSheet.displayName = "ChatSheet";

export default ChatSheet;
