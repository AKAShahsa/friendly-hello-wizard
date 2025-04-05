
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useMusic } from "@/contexts/MusicContext";
import EmojiPicker from "emoji-picker-react";
import { socket } from "@/lib/socket";

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageReactions, setMessageReactions] = useState<{[messageIndex: number]: {[type: string]: string[]}}>({}); 
  const [typingUsers, setTypingUsers] = useState<{[userId: string]: {name: string, timestamp: number}}>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const roomId = useMusic().roomId;
  const users = useMusic().users;
  
  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Handle typing status
  useEffect(() => {
    if (!roomId) return;
    
    const handleTypingStart = (data: {roomId: string, userId: string, userName: string}) => {
      if (data.roomId === roomId && data.userId !== localStorage.getItem("userId")) {
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: {name: data.userName, timestamp: Date.now()}
        }));
      }
    };
    
    const handleTypingStop = (data: {roomId: string, userId: string}) => {
      if (data.roomId === roomId && data.userId !== localStorage.getItem("userId")) {
        setTypingUsers(prev => {
          const newState = {...prev};
          delete newState[data.userId];
          return newState;
        });
      }
    };
    
    socket.on("userTyping", handleTypingStart);
    socket.on("userStoppedTyping", handleTypingStop);
    
    // Clean up stale typing indicators every 10 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const newState = {...prev};
        let hasChanges = false;
        
        Object.entries(newState).forEach(([userId, data]) => {
          if (now - data.timestamp > 5000) {
            delete newState[userId];
            hasChanges = true;
          }
        });
        
        return hasChanges ? newState : prev;
      });
    }, 10000);
    
    return () => {
      socket.off("userTyping", handleTypingStart);
      socket.off("userStoppedTyping", handleTypingStop);
      clearInterval(cleanupInterval);
    };
  }, [roomId]);

  const emitTypingStatus = () => {
    if (!roomId) return;
    
    // Send typing status
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName") || "Anonymous";
    
    if (userId) {
      socket.emit("userTyping", { roomId, userId, userName });
      
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("userStoppedTyping", { roomId, userId });
      }, 3000);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(message);
      setMessage("");
      
      // Clear typing status
      const userId = localStorage.getItem("userId");
      if (roomId && userId && typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        socket.emit("userStoppedTyping", { roomId, userId });
      }
    }
  };

  const handleAIAssistant = () => {
    const newMessage = message.trim().startsWith('@AI') ? message : '@AI ' + message;
    setMessage(newMessage);
    setShowAIPopover(false);
    
    // Focus the input field after setting the message
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };
  
  const handleEmojiClick = (emojiData: any) => {
    const newMessage = message + emojiData.emoji;
    setMessage(newMessage);
    
    // Only close the emoji picker on mobile
    if (isMobile) {
      setShowEmojiPicker(false);
    }
    
    // Focus the input field after selecting emoji
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };
  
  const handleMessageReaction = (messageIndex: number, reactionType: string) => {
    const userId = localStorage.getItem("userId") || "anonymous";
    const userName = localStorage.getItem("userName") || "Anonymous";
    
    // Update local state for immediate visual feedback
    setMessageReactions(prev => {
      const existingReactions = prev[messageIndex] || {};
      const existingReactionUsers = existingReactions[reactionType] || [];
      
      // Check if user already reacted
      if (existingReactionUsers.includes(userId)) {
        return prev; // Don't allow double reactions from same user
      }
      
      return {
        ...prev,
        [messageIndex]: {
          ...(existingReactions || {}),
          [reactionType]: [...existingReactionUsers, userId]
        }
      };
    });
    
    // Provide visual feedback of the reaction
    toast({
      title: "Reaction sent",
      description: `You reacted to the message with ${reactionType === "thumbsUp" ? "👍" : reactionType === "heart" ? "❤️" : "😊"}`,
      duration: 1000
    });
    
    // Broadcast reaction to other users
    if (roomId) {
      socket.emit("messageReaction", { 
        roomId, 
        messageIndex, 
        reactionType, 
        userId,
        userName
      });
    }
    
    // Animate the reaction button
    const buttonElement = document.querySelector(`#message-reaction-${messageIndex}-${reactionType}`);
    if (buttonElement) {
      buttonElement.classList.add('text-primary');
      buttonElement.classList.add('animate-pulse');
      
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

  // Get user count for a specific reaction
  const getReactionCount = (msgIndex: number, reactionType: string) => {
    if (!messageReactions[msgIndex]) return 0;
    return messageReactions[msgIndex][reactionType]?.length || 0;
  };
  
  // Get users who reacted
  const getReactionUsers = (msgIndex: number, reactionType: string) => {
    if (!messageReactions[msgIndex]) return [];
    return messageReactions[msgIndex][reactionType] || [];
  };
  
  // Get active typing users
  const getTypingUserNames = () => {
    return Object.values(typingUsers).map(data => data.name);
  };
  
  // Get user online status
  const getUserOnlineStatus = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.isActive || false;
  };

  // Effect to listen for message reactions from other users
  useEffect(() => {
    if (!roomId) return;
    
    const handleMessageReaction = (data: {
      roomId: string;
      messageIndex: number;
      reactionType: string;
      userId: string;
      userName: string;
    }) => {
      if (data.roomId === roomId) {
        setMessageReactions(prev => {
          const existingReactions = prev[data.messageIndex] || {};
          const existingReactionUsers = existingReactions[data.reactionType] || [];
          
          // Check if user already reacted
          if (existingReactionUsers.includes(data.userId)) {
            return prev; // Don't allow double reactions from same user
          }
          
          // Broadcast toast only if it's not the current user
          if (data.userId !== localStorage.getItem("userId")) {
            toast({
              title: "Reaction",
              description: `${data.userName} reacted with ${data.reactionType === "thumbsUp" ? "👍" : data.reactionType === "heart" ? "❤️" : "😊"}`
            });
          }
          
          return {
            ...prev,
            [data.messageIndex]: {
              ...(existingReactions || {}),
              [data.reactionType]: [...existingReactionUsers, data.userId]
            }
          };
        });
      }
    };
    
    socket.on("messageReaction", handleMessageReaction);
    
    return () => {
      socket.off("messageReaction", handleMessageReaction);
    };
  }, [roomId]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className={`flex flex-col p-0 ${isMobile ? "w-full sm:max-w-full" : ""}`}
      >
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
                    <div className="relative">
                      <Avatar className={`h-8 w-8 ${msg.isAI || msg.userId === 'ai-assistant' ? 'bg-primary/20' : ''}`}>
                        <AvatarFallback className="text-xs">
                          {msg.isAI || msg.userId === 'ai-assistant' ? 'AI' : msg.userName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {msg.userId !== 'ai-assistant' && !msg.isAI && (
                        <span 
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                            getUserOnlineStatus(msg.userId) ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                      )}
                    </div>
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <button 
                              id={`message-reaction-${index}-thumbsUp`}
                              onClick={() => handleMessageReaction(index, 'thumbsUp')}
                              className={`transition-colors flex items-center gap-1 ${
                                getReactionCount(index, 'thumbsUp') > 0 ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                              }`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {getReactionCount(index, 'thumbsUp') > 0 && (
                                <span className="text-xs">{getReactionCount(index, 'thumbsUp')}</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          {getReactionCount(index, 'thumbsUp') > 0 && (
                            <PopoverContent className="w-48 p-2">
                              <p className="text-xs mb-1 font-medium">Reacted with 👍</p>
                              <div className="text-xs text-muted-foreground">
                                {getReactionUsers(index, 'thumbsUp').map(userId => (
                                  <div key={userId} className="py-0.5">
                                    {localStorage.getItem("userId") === userId ? "You" : "User"}
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <button 
                              id={`message-reaction-${index}-heart`}
                              onClick={() => handleMessageReaction(index, 'heart')}
                              className={`transition-colors flex items-center gap-1 ${
                                getReactionCount(index, 'heart') > 0 ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                              }`}
                            >
                              <Heart className="h-3.5 w-3.5" />
                              {getReactionCount(index, 'heart') > 0 && (
                                <span className="text-xs">{getReactionCount(index, 'heart')}</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          {getReactionCount(index, 'heart') > 0 && (
                            <PopoverContent className="w-48 p-2">
                              <p className="text-xs mb-1 font-medium">Reacted with ❤️</p>
                              <div className="text-xs text-muted-foreground">
                                {getReactionUsers(index, 'heart').map(userId => (
                                  <div key={userId} className="py-0.5">
                                    {localStorage.getItem("userId") === userId ? "You" : "User"}
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <button 
                              id={`message-reaction-${index}-smile`}
                              onClick={() => handleMessageReaction(index, 'smile')}
                              className={`transition-colors flex items-center gap-1 ${
                                getReactionCount(index, 'smile') > 0 ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                              }`}
                            >
                              <Smile className="h-3.5 w-3.5" />
                              {getReactionCount(index, 'smile') > 0 && (
                                <span className="text-xs">{getReactionCount(index, 'smile')}</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          {getReactionCount(index, 'smile') > 0 && (
                            <PopoverContent className="w-48 p-2">
                              <p className="text-xs mb-1 font-medium">Reacted with 😊</p>
                              <div className="text-xs text-muted-foreground">
                                {getReactionUsers(index, 'smile').map(userId => (
                                  <div key={userId} className="py-0.5">
                                    {localStorage.getItem("userId") === userId ? "You" : "User"}
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
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
          
          {/* Typing indicator */}
          {getTypingUserNames().length > 0 && (
            <div className="px-4 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse mr-1"></span>
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse delay-100 mr-1"></span>
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse delay-200 mr-2"></span>
                </span>
                {getTypingUserNames().length === 1 ? (
                  <span>{getTypingUserNames()[0]} is typing...</span>
                ) : (
                  <span>{getTypingUserNames().join(", ")} are typing...</span>
                )}
              </div>
            </div>
          )}
          
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
              
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <Smile className="h-3.5 w-3.5" />
                    Emoji
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" side="top">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={isMobile ? "280px" : "350px"}
                    height="350px"
                    searchDisabled={isMobile}
                    skinTonesDisabled={isMobile}
                    previewConfig={{ showPreview: !isMobile }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  emitTypingStatus();
                }}
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
