
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";
import { useTheme } from "@/contexts/ThemeContext";

// Import our new component
import RoomHeader from "@/components/room/RoomHeader";
import TrackDisplay from "@/components/room/TrackDisplay";
import ReactionButtons from "@/components/room/ReactionButtons";
import PlayerControls from "@/components/room/PlayerControls";
import RoomFooter from "@/components/room/RoomFooter";
import QueueSheet from "@/components/room/QueueSheet";
import UsersSheet from "@/components/room/UsersSheet";
import ChatSheet from "@/components/room/ChatSheet";
import AddSongSheet from "@/components/room/AddSongSheet";

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { 
    currentTrack, queue, isPlaying, currentTime, volume,
    users, togglePlayPause, nextTrack, prevTrack, seek, setVolume,
    leaveRoom, messages, sendChatMessage, reactions, sendReaction, addSongByUrl
  } = useMusic();
  
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Handle room leaving on component unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/");
  };

  const activeUsers = users.filter(user => user.isActive);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <RoomHeader 
        roomId={roomId} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />

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
  );
};

export default Room;
