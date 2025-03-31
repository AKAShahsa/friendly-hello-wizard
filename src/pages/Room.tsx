
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";
import { useTheme } from "@/contexts/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

// Import components
import RoomHeader from "@/components/room/RoomHeader";
import TrackDisplay from "@/components/room/TrackDisplay";
import ReactionButtons from "@/components/room/ReactionButtons";
import PlayerControls from "@/components/room/PlayerControls";
import RoomFooter from "@/components/room/RoomFooter";
import QueueSheet from "@/components/room/QueueSheet";
import UsersSheet from "@/components/room/UsersSheet";
import ChatSheet from "@/components/room/ChatSheet";
import AddSongSheet from "@/components/room/AddSongSheet";
import UserAvatars from "@/components/room/UserAvatars";

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // State for UI elements
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  
  // Use try-catch to handle potential context errors
  try {
    const { 
      currentTrack, queue, isPlaying, currentTime, volume,
      users, togglePlayPause, nextTrack, prevTrack, seek, setVolume,
      leaveRoom, messages, sendChatMessage, reactions, sendReaction, addSongByUrl,
      joinRoom, playTrack
    } = useMusic();
    
    useEffect(() => {
      console.log("Room component rendered with roomId:", roomId);
      console.log("Current users:", users);
      console.log("Current queue:", queue);
      console.log("Current track:", currentTrack);
      console.log("Current reactions:", reactions);
    }, [roomId, users, queue, currentTrack, reactions]);
    
    // Join room on mount if roomId is available - only once
    useEffect(() => {
      if (roomId && !hasJoinedRoom) {
        const userName = localStorage.getItem("userName") || "Guest";
        console.log(`Attempting to join room ${roomId} as ${userName}`);
        joinRoom(roomId, userName)
          .then(success => {
            if (success) {
              console.log("Successfully joined room");
              setHasJoinedRoom(true);
            } else {
              console.error("Failed to join room");
              toast({
                title: "Room Error",
                description: "Failed to join the room. Please try again.",
                variant: "destructive"
              });
            }
          })
          .catch(error => {
            console.error("Error joining room:", error);
          });
      }
      
      // Handle room leaving on component unmount
      return () => {
        if (hasJoinedRoom && roomId) {
          console.log("Leaving room on unmount");
          leaveRoom();
        }
      };
    }, [roomId, joinRoom, leaveRoom, hasJoinedRoom]);

    const handleLeaveRoom = useCallback(() => {
      leaveRoom();
      navigate("/");
    }, [leaveRoom, navigate]);

    // Handle play track from queue
    const handlePlayTrackFromQueue = useCallback((track) => {
      console.log("Playing track from queue:", track);
      playTrack(track);
    }, [playTrack]);

    // Memoize to prevent unnecessary re-renders
    const activeUsers = useMemo(() => {
      return users.filter(user => user.isActive);
    }, [users]);
    
    // Memoize component props to prevent unnecessary re-renders
    const roomHeaderProps = useMemo(() => ({
      roomId,
      theme,
      toggleTheme
    }), [roomId, theme, toggleTheme]);
    
    const trackDisplayProps = useMemo(() => ({
      currentTrack
    }), [currentTrack]);
    
    const reactionButtonsProps = useMemo(() => ({
      reactions,
      sendReaction
    }), [reactions, sendReaction]);
    
    const playerControlsProps = useMemo(() => ({
      currentTrack,
      isPlaying,
      currentTime,
      volume,
      togglePlayPause,
      nextTrack,
      prevTrack,
      seek,
      setVolume
    }), [currentTrack, isPlaying, currentTime, volume, togglePlayPause, nextTrack, prevTrack, seek, setVolume]);
    
    const roomFooterProps = useMemo(() => ({
      setIsQueueOpen,
      setIsChatOpen,
      setIsUsersOpen,
      setIsAddSongOpen,
      handleLeaveRoom,
      queueLength: queue.length,
      messagesLength: messages.length,
      activeUsersLength: activeUsers.length
    }), [queue.length, messages.length, activeUsers.length, handleLeaveRoom]);
    
    return (
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
          {/* Header */}
          <RoomHeader {...roomHeaderProps} />

          {/* User Avatars - horizontal scrollable list of users */}
          <UserAvatars users={users} />

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
            {/* Album Art and Track Info */}
            <TrackDisplay {...trackDisplayProps} />

            {/* Reaction Buttons */}
            <ReactionButtons {...reactionButtonsProps} />

            {/* Player Controls */}
            <PlayerControls {...playerControlsProps} />
          </main>

          {/* Sidebar Triggers */}
          <RoomFooter {...roomFooterProps} />

          {/* Queue Sheet */}
          <QueueSheet 
            isOpen={isQueueOpen} 
            onOpenChange={setIsQueueOpen} 
            queue={queue} 
            currentTrack={currentTrack}
            onPlayTrack={handlePlayTrackFromQueue}
          />

          {/* Users Sheet */}
          <UsersSheet 
            isOpen={isUsersOpen} 
            onOpenChange={setIsUsersOpen} 
            users={users}
          />

          {/* Chat Sheet */}
          <ChatSheet 
            isOpen={isChatOpen} 
            onOpenChange={setIsChatOpen} 
            messages={messages}
            sendChatMessage={sendChatMessage}
          />

          {/* Add Song Sheet */}
          <AddSongSheet 
            isOpen={isAddSongOpen} 
            onOpenChange={setIsAddSongOpen} 
            addSongByUrl={addSongByUrl}
          />
        </div>
      </TooltipProvider>
    );
  } catch (error) {
    // If the context is not available, redirect to home page
    console.error("Music context error:", error);
    
    // Use effect to navigate after render to avoid React state updates during render
    useEffect(() => {
      toast({
        title: "Room Error",
        description: "Could not connect to music room. Redirecting to home page.",
        variant: "destructive"
      });
      
      setTimeout(() => {
        navigate("/");
      }, 2000);
    }, [navigate]);
    
    // Return a loading state while redirecting
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <h2 className="text-2xl font-bold mb-4">Connecting to Room...</h2>
        <p className="text-muted-foreground">Please wait or return to the home page.</p>
      </div>
    );
  }
};

export default Room;
