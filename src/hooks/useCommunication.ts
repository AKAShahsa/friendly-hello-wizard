
import { useState, useEffect, useCallback, useRef } from "react";
import { ref, push, update, increment, onValue, set } from "firebase/database";
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
  
  // Use refs to prevent unnecessary re-renders
  const messagesRef = useRef<ChatMessage[]>([]);
  const reactionsRef = useRef<Reaction>({
    thumbsUp: 0,
    heart: 0,
    smile: 0
  });

  // Listen for messages and reactions updates
  useEffect(() => {
    if (!roomId) return;
    
    let messagesUnsubscribe: () => void = () => {};
    let reactionsUnsubscribe: () => void = () => {};

    try {
      // Listen for messages updates
      const dbMessagesRef = ref(rtdb, `rooms/${roomId}/messages`);
      messagesUnsubscribe = onValue(dbMessagesRef, (snapshot) => {
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
          
          // Only update state if messages have changed
          if (JSON.stringify(messagesList) !== JSON.stringify(messagesRef.current)) {
            messagesRef.current = messagesList;
            setMessages(messagesList);
          }
        }
      });

      // Listen for reactions updates
      const dbReactionsRef = ref(rtdb, `rooms/${roomId}/reactions`);
      reactionsUnsubscribe = onValue(dbReactionsRef, (snapshot) => {
        if (snapshot.exists()) {
          const reactionsData = snapshot.val();
          const newReactions = {
            thumbsUp: parseInt(reactionsData.thumbsUp || 0),
            heart: parseInt(reactionsData.heart || 0),
            smile: parseInt(reactionsData.smile || 0)
          };
          
          console.log("Firebase reactions data:", reactionsData);
          console.log("Parsed reactions:", newReactions);
          
          // Only update state if reactions have changed
          if (
            newReactions.thumbsUp !== reactionsRef.current.thumbsUp ||
            newReactions.heart !== reactionsRef.current.heart ||
            newReactions.smile !== reactionsRef.current.smile
          ) {
            reactionsRef.current = newReactions;
            setReactions(newReactions);
          }
        }
      });
    } catch (error) {
      console.error("Error setting up communication listeners:", error);
    }

    return () => {
      messagesUnsubscribe();
      reactionsUnsubscribe();
    };
  }, [roomId]);

  const sendChatMessage = useCallback((text: string) => {
    if (!roomId || !text.trim()) return;
    
    const userName = localStorage.getItem("userName") || "Anonymous";
    
    const message: ChatMessage = {
      userId,
      userName,
      text,
      timestamp: Date.now()
    };
    
    try {
      const messagesRef = ref(rtdb, `rooms/${roomId}/messages`);
      push(messagesRef, message)
        .catch(error => {
          toast({
            title: "Error sending message",
            description: "Your message could not be sent. Please try again.",
            variant: "destructive"
          });
        });
      
      socket.emit("newMessage", { roomId, message });
    } catch (error) {
      console.error("Error sending chat message:", error);
    }
  }, [roomId, userId]);

  const sendReaction = useCallback((reactionType: keyof Reaction) => {
    if (!roomId) return;

    try {
      console.log(`Updating reaction ${reactionType} in room ${roomId}`);
      
      // Update with direct value instead of increment to fix race conditions
      const reactionRef = ref(rtdb, `rooms/${roomId}/reactions/${reactionType}`);
      const newValue = (reactionsRef.current[reactionType] || 0) + 1;
      
      set(reactionRef, newValue)
        .then(() => {
          console.log(`Reaction ${reactionType} updated to ${newValue}`);
          // Update local state immediately for better UX
          setReactions(prev => ({
            ...prev,
            [reactionType]: newValue
          }));
        })
        .catch(error => {
          console.error("Error updating reaction:", error);
          toast({
            title: "Error sending reaction",
            description: "Your reaction could not be sent.",
            variant: "destructive"
          });
        });

      socket.emit("newReaction", { roomId, reactionType, userId });
    } catch (error) {
      console.error("Error sending reaction:", error);
    }
  }, [roomId, userId]);

  return {
    messages,
    setMessages,
    reactions,
    setReactions,
    sendChatMessage,
    sendReaction
  };
};
