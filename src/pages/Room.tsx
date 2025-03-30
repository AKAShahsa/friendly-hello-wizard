
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

  // Join room on mount if roomId is available - only once
  useEffect(() => {
    if (roomId) {
      const userName = localStorage.getItem("userName") || "Guest";
      joinRoom(roomId, userName);
    }
    
    // Handle room leaving on component unmount
    return () => {
      leaveRoom();
    };
  }, [roomId, joinRoom, leaveRoom]);

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    navigate("/");
  }, [leaveRoom, navigate]);

  // Memoize to prevent unnecessary re-renders
  const activeUsers = useMemo(() => users.filter(user => user.isActive), [users]);
  
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
        {/* Header */}
        <RoomHeader 
          roomId={roomId} 
          theme={theme} 
          toggleTheme={toggleTheme} 
        />

        {/* User Avatars - horizontal scrollable list of users */}
        <UserAvatars users={users} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          {/* Album Art and Track Info */}
          <TrackDisplay currentTrack={currentTrack} />

          {/* Reaction Buttons */}
          <ReactionButtons reactions={reactions} sendReaction={sendReaction} />

          {/* Player Controls */}
          <PlayerControls 
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            volume={volume}
            togglePlayPause={togglePlayPause}
            nextTrack={nextTrack}
            prevTrack={prevTrack}
            seek={seek}
            setVolume={setVolume}
          />
        </main>

        {/* Sidebar Triggers */}
        <RoomFooter 
          setIsQueueOpen={setIsQueueOpen}
          setIsChatOpen={setIsChatOpen}
          setIsUsersOpen={setIsUsersOpen}
          setIsAddSongOpen={setIsAddSongOpen}
          handleLeaveRoom={handleLeaveRoom}
          queueLength={queue.length}
          messagesLength={messages.length}
          activeUsersLength={activeUsers.length}
        />

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
