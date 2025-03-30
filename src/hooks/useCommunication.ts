
import { useState, useEffect } from "react";
import { ref, push, update, increment, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { socket } from "@/lib/socket";
import { Reaction, ChatMessage } from "@/types/music";

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
        const messagesList = Object.values(messagesData);
        setMessages(messagesList as ChatMessage[]);
      }
    });

    // Listen for reactions updates
    const reactionsRef = ref(rtdb, `rooms/${roomId}/reactions`);
    const reactionsUnsubscribe = onValue(reactionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const reactionsData = snapshot.val();
        setReactions(reactionsData as Reaction);
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
    
    const message = {
      userId,
      userName,
      text,
      timestamp: Date.now()
    };
    
    const messagesRef = ref(rtdb, `rooms/${roomId}/messages`);
    push(messagesRef, message);
    
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
    update(reactionRef, { [".value"]: increment(1) });

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
