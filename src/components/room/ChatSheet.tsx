import React, { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Plus } from "lucide-react";
import { ChatMessage } from "@/types/music";
import EmojiPicker from "./EmojiPicker";
import MessageReactions from "./MessageReactions";
import { socket, getCurrentRoomId } from "@/lib/socket";
import { rtdb } from "@/lib/firebase";
import { ref, push, update, get } from "firebase/database";

interface MessageWithReactions extends ChatMessage {
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
}

interface ChatSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  messages: ChatMessage[];
  sendChatMessage: (text: string) => void;
}

const ChatSheet: React.FC<ChatSheetProps> = ({ 
  isOpen, 
  onOpenChange, 
  messages, 
  sendChatMessage 
}) => {
  const [text, setText] = useState("");
  const [messagesWithReactions, setMessagesWithReactions] = useState<MessageWithReactions[]>([]);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const roomId = getCurrentRoomId();
  const userId = localStorage.getItem("userId") || "";
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  useEffect(() => {
    const processedMessages = messages.map(msg => ({
      ...msg,
      reactions: []
    }));
    setMessagesWithReactions(processedMessages);
    
    if (roomId) {
      const reactionsRef = ref(rtdb, `rooms/${roomId}/messageReactions`);
      get(reactionsRef).then(snapshot => {
        if (snapshot.exists()) {
          const reactionData = snapshot.val();
          
          const updatedMessages = processedMessages.map(msg => {
            const msgReactions = reactionData[msg.timestamp];
            if (msgReactions) {
              return {
                ...msg,
                reactions: Object.entries(msgReactions).map(([emoji, data]) => ({
                  emoji,
                  count: Object.keys(data).length,
                  userIds: Object.keys(data)
                }))
              };
            }
            return msg;
          });
          
          setMessagesWithReactions(updatedMessages);
        }
      });
    }
  }, [messages, roomId]);
  
  useEffect(() => {
    if (!roomId) return;
    
    const reactionsRef = ref(rtdb, `rooms/${roomId}/messageReactions`);
    
    const handleMessageReaction = (data: any) => {
      if (data.roomId === roomId) {
        get(reactionsRef).then(snapshot => {
          if (snapshot.exists()) {
            const reactionData = snapshot.val();
            
            setMessagesWithReactions(prev => prev.map(msg => {
              if (msg.timestamp === data.messageTimestamp) {
                const msgReactions = reactionData[msg.timestamp];
                if (msgReactions) {
                  return {
                    ...msg,
                    reactions: Object.entries(msgReactions).map(([emoji, data]) => ({
                      emoji,
                      count: Object.keys(data).length,
                      userIds: Object.keys(data)
                    }))
                  };
                }
              }
              return msg;
            }));
          }
        });
      }
    };
    
    socket.on("messageReaction", handleMessageReaction);
    
    return () => {
      socket.off("messageReaction", handleMessageReaction);
    };
  }, [roomId]);
  
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesWithReactions]);
  
  const handleSendMessage = () => {
    if (text.trim()) {
      sendChatMessage(text.trim());
      setText("");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleEmojiSelect = (emoji: string) => {
    setText(prev => prev + emoji);
  };
  
  const handleAddReaction = (messageTimestamp: number, emoji: string) => {
    if (!roomId) return;
    
    const reactionRef = ref(rtdb, `rooms/${roomId}/messageReactions/${messageTimestamp}/${emoji}/${userId}`);
    update(reactionRef, { 
      timestamp: Date.now(),
      userId
    }).then(() => {
      setMessagesWithReactions(prev => 
        prev.map(msg => {
          if (msg.timestamp === messageTimestamp) {
            const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
            
            if (existingReaction) {
              if (!existingReaction.userIds.includes(userId)) {
                return {
                  ...msg,
                  reactions: msg.reactions?.map(r => 
                    r.emoji === emoji 
                      ? { ...r, count: r.count + 1, userIds: [...r.userIds, userId] }
                      : r
                  )
                };
              }
              return msg;
            } else {
              return {
                ...msg,
                reactions: [
                  ...(msg.reactions || []),
                  { emoji, count: 1, userIds: [userId] }
                ]
              };
            }
          }
          return msg;
        })
      );
      
      socket.emit("messageReaction", { 
        roomId, 
        messageTimestamp, 
        emoji, 
        userId, 
        userName: localStorage.getItem("userName") || "Anonymous" 
      });
    });
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[350px] sm:w-[400px]">
        <div className="h-full flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Room Chat</h2>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 p-1">
              {messagesWithReactions.map((message, index) => (
                <div 
                  key={`${message.userId}-${message.timestamp}`}
                  className={`flex flex-col ${message.userId === userId ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex flex-col max-w-[85%] group">
                    <div
                      className={`rounded-lg px-4 py-2 text-sm shadow-sm ${
                        message.userId === userId
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-secondary/80 rounded-tl-none'
                      }`}
                    >
                      <div className="font-semibold text-xs mb-1">
                        {message.userId === userId ? 'You' : message.userName}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{message.text}</div>
                      <div className="text-xs opacity-70 mt-1 text-right">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                    
                    <div className={`${message.userId === userId ? 'self-end' : 'self-start'} -mt-1`}>
                      <MessageReactions 
                        reactions={message.reactions || []}
                        onAddReaction={(emoji) => handleAddReaction(message.timestamp, emoji)}
                        messageId={`${message.userId}-${message.timestamp}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div ref={endOfMessagesRef} />
            </div>
          </ScrollArea>
          
          <div className="mt-4 flex gap-2 items-center bg-secondary/30 p-2 rounded-lg">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            <Input
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-background/70"
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage}
              disabled={!text.trim()}
              className="bg-primary/90 hover:bg-primary"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChatSheet;
