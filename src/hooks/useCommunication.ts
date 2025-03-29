
import { useState } from "react";
import { ref, push, update, increment } from "firebase/database";
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

    const reactionRef = ref(rtdb, `rooms/${roomId}/reactions/${reactionType}`);
    update(reactionRef, increment(1));

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
