
import { useState, useEffect } from "react";
import { ref, push, update, increment, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { socket } from "@/lib/socket";
import { Reaction, ChatMessage } from "@/types/music";
import { toast } from "@/hooks/use-toast";

export const useCommunication = (roomId: string | null, userId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction>({
    thumbsUp: 0,
    heart: 0,
    smile: 0
  });

  // Listen for messages and reactions updates
  useEffect(() => {
    if (!roomId) return;

    // Listen for messages updates
    const messagesRef = ref(rtdb, `rooms/${roomId}/messages`);
    const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messagesList = Object.entries(messagesData).map(([key, value]) => {
          // Ensure value is properly typed as ChatMessage
          const msg = value as any;
          if (
            msg && 
            typeof msg.userId === 'string' && 
            typeof msg.userName === 'string' && 
            typeof msg.text === 'string' && 
            typeof msg.timestamp === 'number'
          ) {
            return {
              userId: msg.userId,
              userName: msg.userName,
              text: msg.text,
              timestamp: msg.timestamp
            } as ChatMessage;
          }
          return null;
        }).filter(Boolean) as ChatMessage[];
        
        setMessages(messagesList);
      }
    });

    // Listen for reactions updates
    const reactionsRef = ref(rtdb, `rooms/${roomId}/reactions`);
    const reactionsUnsubscribe = onValue(reactionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const reactionsData = snapshot.val();
        setReactions({
          thumbsUp: reactionsData.thumbsUp || 0,
          heart: reactionsData.heart || 0,
          smile: reactionsData.smile || 0
        });
      }
    });

    return () => {
      messagesUnsubscribe();
      reactionsUnsubscribe();
    };
  }, [roomId]);

  const sendChatMessage = (text: string) => {
    if (!roomId || !text.trim()) return;
    
    const userName = localStorage.getItem("userName") || "Anonymous";
    
    const message: ChatMessage = {
      userId,
      userName,
      text,
      timestamp: Date.now()
    };
    
    const messagesRef = ref(rtdb, `rooms/${roomId}/messages`);
    push(messagesRef, message)
      .then(() => {
        // Success - don't show toast to avoid toast flood
      })
      .catch(error => {
        toast({
          title: "Error sending message",
          description: "Your message could not be sent. Please try again.",
          variant: "destructive"
        });
      });
    
    socket.emit("newMessage", { roomId, message });
  };

  const sendReaction = (reactionType: keyof Reaction) => {
    if (!roomId) return;

    // First update the local state to provide immediate feedback
    setReactions(prev => ({
      ...prev,
      [reactionType]: (prev[reactionType] || 0) + 1
    }));

    // Then update the database
    const reactionRef = ref(rtdb, `rooms/${roomId}/reactions/${reactionType}`);
    update(reactionRef, { [".value"]: increment(1) })
      .catch(error => {
        // Revert local update on error
        setReactions(prev => ({
          ...prev,
          [reactionType]: Math.max((prev[reactionType] || 0) - 1, 0)
        }));
        
        toast({
          title: "Error sending reaction",
          description: "Your reaction could not be sent.",
          variant: "destructive"
        });
      });

    socket.emit("newReaction", { roomId, reactionType, userId });
  };

  return {
    messages,
    setMessages,
    reactions,
    setReactions,
    sendChatMessage,
    sendReaction
  };
};
