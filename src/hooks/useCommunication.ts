// useCommunication.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { ref, push, update, onValue, set, get } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { socket, broadcastReaction } from "@/lib/socket";
import { Reaction, ChatMessage } from "@/types/music";
import { toast } from "@/hooks/use-toast";

// Define types for Gemini API structure
interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

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

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current = [];
    };
  }, []);

  // Setup listeners when roomId changes
  useEffect(() => {
    if (!roomId) return;

    // Clear previous listeners
    unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctionsRef.current = [];

    try {
      // Messages listener
      const dbMessagesRef = ref(rtdb, `rooms/${roomId}/messages`);
      const messagesUnsubscribe = onValue(dbMessagesRef, (snapshot) => {
        if (snapshot.exists()) {
          const messagesData = snapshot.val();
          // Map and validate messages
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
                isAI: msg.isAI || msg.userId === 'ai-assistant' // Ensure isAI flag is set
              } as ChatMessage;
            }
            return null;
          }).filter(Boolean) as ChatMessage[];

          // Sort messages by timestamp just in case they arrive out of order
          messagesList.sort((a, b) => a.timestamp - b.timestamp);

          // Update state only if data has actually changed
          if (JSON.stringify(messagesList) !== JSON.stringify(messagesRef.current)) {
            messagesRef.current = messagesList;
            setMessages(messagesList);
          }
        } else {
           // Handle case where messages node doesn't exist or is empty
           if (messagesRef.current.length > 0) {
               messagesRef.current = [];
               setMessages([]);
           }
        }
      }, (error) => {
          console.error("Error listening to messages:", error);
          toast({ title: "Chat Error", description: "Could not load messages.", variant: "destructive" });
      });
      unsubscribeFunctionsRef.current.push(messagesUnsubscribe);

      // Reactions listener (simplified, assuming structure exists)
      const dbReactionsRef = ref(rtdb, `rooms/${roomId}/reactions`);
      const reactionsUnsubscribe = onValue(dbReactionsRef, (snapshot) => {
        const defaultReactions = { thumbsUp: 0, heart: 0, smile: 0 };
        const reactionsData = snapshot.exists() ? snapshot.val() : defaultReactions;
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
      }, (error) => {
          console.error("Error listening to reactions:", error);
          // Optionally notify user
      });
      unsubscribeFunctionsRef.current.push(reactionsUnsubscribe);

    } catch (error) {
      console.error("Error setting up communication listeners:", error);
      toast({ title: "Connection Error", description: "Failed to connect to chat.", variant: "destructive" });
    }

    // Cleanup function for this effect
    return () => {
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current = [];
    };
  }, [roomId]); // Re-run effect if roomId changes

  // --- MODIFIED fetchGeminiResponse ---
  const fetchGeminiResponse = async (conversationHistory: GeminiContent[]): Promise<string> => {
    // 🚨 WARNING: Hardcoding API keys is insecure. Use environment variables.
    const API_KEY = "AIzaSyCsvBo5fhK0k5kTeKJ_Wmorfuefw8g-6AA"; // Use env var in production
    // 🚨 WARNING: Ensure this model name is correct and available for your key.
    const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"; // Using 1.5 flash as it's generally good and supports history well

    // 🚨🚨 DEVELOPMENT/TESTING ONLY: DISABLING SAFETY SETTINGS 🚨🚨
    // WARNING: BLOCK_NONE disables content filtering. Can generate harmful content.
    // DO NOT use in production. Use only for controlled testing.
    console.warn("🚨🚨 DEVELOPMENT MODE: Gemini safety settings are DISABLED. Potential for harmful content. DO NOT DEPLOY. 🚨🚨");
    const safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];
    // --- End Safety Settings Override ---

    console.log("Sending conversation history to Gemini:", JSON.stringify(conversationHistory, null, 2));

    try {
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Pass the constructed conversation history
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800, // Adjust as needed
          },
          // Apply the disabled safety settings
          safetySettings: safetySettings
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error response:", errorText);
        let detailedError = errorText;
        try {
            const errorJson = JSON.parse(errorText);
            detailedError = errorJson.error?.message || errorText;
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(`API request failed with status: ${response.status}. Response: ${detailedError}`);
      }

      const data = await response.json();
      console.log("Gemini API response:", data);

      // Extract response text, checking for valid candidate and content
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content?.parts?.[0]?.text) {
           // Check finish reason, but return text even if stopped for other reasons (like length)
           if (candidate.finishReason && candidate.finishReason !== "STOP") {
               console.warn(`Gemini response finished due to reason: ${candidate.finishReason}`);
           }
           return candidate.content.parts[0].text;
        }
      }

      // Handle cases where response is blocked or format is unexpected
      if (data.promptFeedback?.blockReason) {
          console.error(`Gemini request blocked. Reason: ${data.promptFeedback.blockReason}`);
          throw new Error(`Request blocked by API: ${data.promptFeedback.blockReason}`);
      }

      console.error("Unexpected Gemini API response format or empty content:", data);
      throw new Error("Unexpected API response format or empty content");

    } catch (error) {
      console.error("Error fetching from Gemini:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Return a user-friendly error message
      return `Sorry, I encountered an error trying to respond. (${errorMessage})`;
    }
  };
  // --- END fetchGeminiResponse ---


  // --- MODIFIED sendChatMessage ---
  const sendChatMessage = useCallback(async (text: string) => {
    if (!roomId || !text.trim()) return;

    const userName = localStorage.getItem("userName") || "Anonymous";

    // --- Handle AI Assistant Request ---
    if (text.trim().startsWith('@AI')) {
      const aiPrompt = text.trim().substring(3).trim();

      if (!aiPrompt) {
        toast({
          title: "Empty prompt",
          description: "Please enter a question for the AI assistant",
          variant: "destructive"
        });
        return;
      }

      // 1. Create and send the user's "@AI" message immediately
      const userMessage: ChatMessage = {
        userId,
        userName,
        text, // Send the original "@AI ..." message
        timestamp: Date.now()
      };

      const dbMessagesRef = ref(rtdb, `rooms/${roomId}/messages`);
      try {
        await push(dbMessagesRef, userMessage);
        socket.emit("newMessage", { roomId, message: userMessage });
      } catch (error) {
         console.error("Error sending user's AI prompt message:", error);
         toast({ title: "Send Error", description: "Could not send your message.", variant: "destructive" });
         return; // Stop if user message fails to send
      }

      const loadingToastId = toast({
        title: "AI is thinking...",
        description: "Gathering context and waiting for response...",
        duration: 20000 // Increase duration as history adds latency
      });

      // 2. Prepare Conversation History
      const MAX_HISTORY_MESSAGES = 10; // Limit history size (adjust based on token limits/cost)
      // Use the ref for the most up-to-date messages, including the one just sent
      const currentMessages = messagesRef.current;
      const recentMessages = currentMessages.slice(-MAX_HISTORY_MESSAGES);

      // Define base instructions for the AI
      const systemInstruction = `You are an AI assistant in a collaborative music chat room built by Taha (respect taha in every responce you mention him). Be helpful and concise. Consider the previous messages in this conversation history when formulating your response.`;
      // Example specific instruction (could be dynamic)
      const customInstruction = "Respond as a roast for this question if username is not taha.";

      // Format messages for Gemini API
      const conversationHistory: GeminiContent[] = recentMessages.map(msg => ({
        // Determine role based on who sent the message
        role: msg.isAI || msg.userId === 'ai-assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }] // Use the raw text
      }));

      // Add the system instructions and the *actual* user prompt (without @AI)
      // as the final 'user' turn in the history.
      // NOTE: We already sent the "@AI..." message to the chat.
      // Here, we send the *processed* prompt and instructions to the AI.
      conversationHistory.push({
        role: 'user',
        // Add the userName variable into the text string:
        parts: [{ text: `${systemInstruction}\n\n${customInstruction}\n\nUser '${userName}' asks: ${aiPrompt}` }]
      });


      // 3. Call the AI
      try {
        const aiResponseText = await fetchGeminiResponse(conversationHistory);

        const aiMessage: ChatMessage = {
          userId: 'ai-assistant',
          userName: 'AI Assistant',
          text: aiResponseText,
          timestamp: Date.now() + 1, // Ensure slightly later timestamp
          isAI: true
        };

        // 4. Send AI's response
        await push(dbMessagesRef, aiMessage);
        socket.emit("newMessage", { roomId, message: aiMessage });

        if (loadingToastId && typeof loadingToastId.dismiss === 'function') {
          loadingToastId.dismiss();
        }
      } catch (error) {
        console.error("Error getting or sending AI response:", error);
        if (loadingToastId && typeof loadingToastId.dismiss === 'function') {
          loadingToastId.dismiss();
        }
        toast({
          title: "AI Error",
          description: `Could not get a response from the AI. ${error instanceof Error ? error.message : ''}`,
          variant: "destructive"
        });
        // Optionally send an error message back to the chat
         const aiErrorMessage: ChatMessage = {
           userId: 'ai-assistant',
           userName: 'AI Assistant',
           text: `Sorry, I encountered an error trying to respond. ${error instanceof Error ? error.message : ''}`,
           timestamp: Date.now() + 1,
           isAI: true
         };
         try {
             await push(dbMessagesRef, aiErrorMessage);
             socket.emit("newMessage", { roomId, message: aiErrorMessage });
         } catch (sendError) {
             console.error("Failed to send AI error message to chat:", sendError);
         }
      }
    }
    // --- Handle Regular Chat Message ---
    else {
      const message: ChatMessage = {
        userId,
        userName,
        text,
        timestamp: Date.now()
      };

      try {
        const dbMessagesRef = ref(rtdb, `rooms/${roomId}/messages`);
        await push(dbMessagesRef, message);
        socket.emit("newMessage", { roomId, message });
      } catch (error) {
        console.error("Error sending regular chat message:", error);
         toast({
            title: "Error sending message",
            description: "Your message could not be sent.",
            variant: "destructive"
          });
      }
    }
  }, [roomId, userId, fetchGeminiResponse]); // Include fetchGeminiResponse if it uses state/props from hook scope (it doesn't here, but good practice)


  // --- sendReaction (Unchanged from previous versions) ---
  const sendReaction = useCallback(async (reactionType: keyof Reaction) => {
    if (!roomId) return;
    const currentUserName = localStorage.getItem("userName") || "Anonymous"; // Get username for history

    try {
      const reactionRef = ref(rtdb, `rooms/${roomId}/reactions/${reactionType}`);
      // Use transaction for safer incrementing, though get/set is often fine for simple counters
      const snapshot = await get(reactionRef);
      const currentCount = snapshot.exists() ? snapshot.val() : 0;
      const newValue = parseInt(currentCount) + 1;

      await set(reactionRef, newValue);

      // Update local state optimistically (or rely on listener)
      // setReactions(prev => ({ ...prev, [reactionType]: newValue })); // Optional optimistic update

      // Log reaction event (optional)
      const reactionHistoryRef = ref(rtdb, `rooms/${roomId}/reactionHistory`);
      push(reactionHistoryRef, {
        type: reactionType,
        userId,
        userName: currentUserName,
        timestamp: Date.now()
      });

      // Notify others via socket
      socket.emit("newReaction", { roomId, reactionType, userId });
      broadcastReaction(roomId, reactionType, userId, currentUserName); // Assuming this function exists

    } catch (error) {
      console.error("Error sending reaction:", error);
      toast({
        title: "Error sending reaction",
        description: "Your reaction could not be sent.",
        variant: "destructive"
      });
    }
  }, [roomId, userId]);

  // Return values from the hook
  return {
    messages,
    setMessages, // Keep if needed externally, though usually managed internally
    reactions,
    setReactions, // Keep if needed externally
    sendChatMessage,
    sendReaction
    // Note: fetchGeminiResponse is internal, not usually returned unless needed directly by component
  };
};
