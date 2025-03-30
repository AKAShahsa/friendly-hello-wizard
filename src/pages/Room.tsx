
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";
import { useTheme } from "@/contexts/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  const { 
    currentTrack, queue, isPlaying, currentTime, volume,
    users, togglePlayPause, nextTrack, prevTrack, seek, setVolume,
    leaveRoom, messages, sendChatMessage, reactions, sendReaction, addSongByUrl,
    joinRoom
  } = useMusic();
  
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Track if room has been joined to prevent multiple join attempts
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  // Join room on mount if roomId is available - only once
  useEffect(() => {
    if (roomId && !hasJoinedRoom) {
      const userName = localStorage.getItem("userName") || "Guest";
      joinRoom(roomId, userName);
      setHasJoinedRoom(true);
    }
    
    // Handle room leaving on component unmount
    return () => {
      if (hasJoinedRoom) {
        leaveRoom();
      }
    };
  }, [roomId, joinRoom, leaveRoom, hasJoinedRoom]);

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    navigate("/");
  }, [leaveRoom, navigate]);

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
};

export default Room;
