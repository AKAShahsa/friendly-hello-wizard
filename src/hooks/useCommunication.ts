
import { useState, useEffect, useCallback, useRef } from "react";
import { ref, push, update, set, get, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { socket, broadcastReaction, broadcastToast } from "@/lib/socket";
import { Reaction, ChatMessage } from "@/types/music";
import { toast } from "@/hooks/use-toast";

export const useCommunication = (roomId: string | null, userId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction>({
    thumbsUp: 0,
    heart: 0,
    smile: 0
  });
  
  const messagesRef = useRef<ChatMessage[]>([]);
  const reactionsRef = useRef<Reaction>({
    thumbsUp: 0,
    heart: 0,
    smile: 0
  });
  
  const unsubscribeFunctionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    return () => {
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    
    unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctionsRef.current = [];

    try {
      const dbMessagesRef = ref(rtdb, `rooms/${roomId}/messages`);
      const messagesUnsubscribe = onValue(dbMessagesRef, (snapshot) => {
        if (snapshot.exists()) {
          const messagesData = snapshot.val();
          const messagesList = Object.entries(messagesData).map(([key, value]) => {
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
                timestamp: msg.timestamp,
                isAI: msg.isAI || msg.userId === 'ai-assistant'
              } as ChatMessage;
            }
            return null;
          }).filter(Boolean) as ChatMessage[];
          
          if (JSON.stringify(messagesList) !== JSON.stringify(messagesRef.current)) {
            messagesRef.current = messagesList;
            setMessages(messagesList);
          }
        }
      });
      unsubscribeFunctionsRef.current.push(messagesUnsubscribe);

      const dbReactionsRef = ref(rtdb, `rooms/${roomId}/reactions`);
      const reactionsUnsubscribe = onValue(dbReactionsRef, (snapshot) => {
        if (snapshot.exists()) {
          const reactionsData = snapshot.val();
          const newReactions = {
            thumbsUp: parseInt(reactionsData.thumbsUp || 0),
            heart: parseInt(reactionsData.heart || 0),
            smile: parseInt(reactionsData.smile || 0)
          };
          
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
      unsubscribeFunctionsRef.current.push(reactionsUnsubscribe);
    } catch (error) {
      console.error("Error setting up communication listeners:", error);
    }

    return () => {
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current = [];
    };
  }, [roomId]);

  const sendChatMessage = useCallback(async (text: string) => {
    if (!roomId || !text.trim()) return;
    
    const userName = localStorage.getItem("userName") || "Anonymous";
    
    if (text.trim().startsWith('@AI')) {
      let aiPrompt = text.trim().substring(3).trim();
      
      if (!aiPrompt) {
        toast({
          title: "Empty prompt",
          description: "Please enter a question for the AI assistant",
          variant: "destructive"
        });
        return;
      }
      
      const userMessage: ChatMessage = {
        userId,
        userName,
        text,
        timestamp: Date.now()
      };
      
      try {
        const messagesRef = ref(rtdb, `rooms/${roomId}/messages`);
        await push(messagesRef, userMessage);
        
        socket.emit("newMessage", { roomId, message: userMessage });
        
        const loadingToastId = toast({
          title: "AI is thinking...",
          description: "Waiting for response from AI assistant",
          duration: 10000
        });
      const customInstruction = "responce as a roast for this question.";
       const promptForGemini = `${customInstruction}\n\n${aiPrompt}`;
        try {
          const aiResponse = await fetchGeminiResponse(promptForGemini);
          
          const aiMessage: ChatMessage = {
            userId: 'ai-assistant',
            userName: 'AI Assistant',
            text: aiResponse,
            timestamp: Date.now() + 100,
            isAI: true
          };
          
          await push(messagesRef, aiMessage);
          
          socket.emit("newMessage", { roomId, message: aiMessage });
          
          // Broadcast toast for AI response to all users
          broadcastToast(roomId, "AI Response", `AI has responded to ${userName}'s question`);
          
          if (loadingToastId && typeof loadingToastId.dismiss === 'function') {
            loadingToastId.dismiss();
          }
        } catch (error) {
          console.error("Error fetching AI response:", error);
          if (loadingToastId && typeof loadingToastId.dismiss === 'function') {
            loadingToastId.dismiss();
          }
          toast({
            title: "AI Error",
            description: "Could not get a response from the AI. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error sending messages:", error);
        toast({
          title: "Error sending message",
          description: "Your message could not be sent. Please try again.",
          variant: "destructive"
        });
      }
    } else {
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
            console.error("Error pushing message to Firebase:", error);
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
    }
  }, [roomId, userId]);

  const sendReaction = useCallback(async (reactionType: keyof Reaction) => {
    if (!roomId) return;

    try {
      const reactionRef = ref(rtdb, `rooms/${roomId}/reactions/${reactionType}`);
      const snapshot = await get(reactionRef);
      const currentCount = snapshot.exists() ? snapshot.val() : 0;
      const newValue = parseInt(currentCount) + 1;
      
      await set(reactionRef, newValue)
        .then(() => {
          setReactions(prev => ({
            ...prev,
            [reactionType]: newValue
          }));
          
          const reactionHistoryRef = ref(rtdb, `rooms/${roomId}/reactionHistory`);
          push(reactionHistoryRef, {
            type: reactionType,
            userId,
            userName: localStorage.getItem("userName") || "Anonymous",
            timestamp: Date.now()
          });
        })
        .catch(error => {
          console.error("Error updating reaction:", error);
          toast({
            title: "Error sending reaction",
            description: "Your reaction could not be sent.",
            variant: "destructive"
          });
        });

      socket.emit("newReaction", { 
        roomId, 
        reactionType, 
        userId 
      });
      
      const userName = localStorage.getItem("userName") || "Anonymous";
      broadcastReaction(roomId, reactionType, userId, userName);
      
      // Broadcast toast message about the reaction
      broadcastToast(
        roomId, 
        "New Reaction", 
        `${userName} reacted with ${reactionType === "thumbsUp" ? "👍" : reactionType === "heart" ? "❤️" : "😊"}`
      );
    } catch (error) {
      console.error("Error sending reaction:", error);
    }
  }, [roomId, userId]);

  const fetchGeminiResponse = async (prompt: string): Promise<string> => {
    try {
      const API_KEY = "AIzaSyCsvBo5fhK0k5kTeKJ_Wmorfuefw8g-6AA";
      const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
      const safetySettings = [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ];
      // --- End Safety Settings Override ---
      console.log("Sending prompt to Gemini:", prompt);
      
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an AI assistant in a music chat room. Please respond helpfully and keep answers concise. 
                  User question: ${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
          safetySettings: safetySettings
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Gemini API response:", data);
      
      if (data.candidates && 
          data.candidates[0] && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.error("Unexpected Gemini API response format:", data);
        throw new Error("Unexpected API response format");
      }
    } catch (error) {
      console.error("Error fetching from Gemini:", error);
      return "Sorry, I couldn't process your request at the moment.";
    }
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

