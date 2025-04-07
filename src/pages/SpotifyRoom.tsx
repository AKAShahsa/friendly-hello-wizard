
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";
import { useTheme } from "@/contexts/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useSpotify } from "@/contexts/SpotifyContext";

// Import components
import RoomHeader from "@/components/room/RoomHeader";
import TrackDisplay from "@/components/room/TrackDisplay";
import ReactionButtons from "@/components/room/ReactionButtons";
import PlayerControls from "@/components/room/PlayerControls";
import QueueSheet from "@/components/room/QueueSheet";
import UsersSheet from "@/components/room/UsersSheet";
import ChatSheet from "@/components/room/ChatSheet";
import AddSongSheet from "@/components/room/AddSongSheet";
import UserAvatars from "@/components/room/UserAvatars";
import SpotifySearchSheet from "@/components/spotify/SpotifySearchSheet";
import SpotifyButton from "@/components/spotify/SpotifyButton";
import YouTubeMusicButton from "@/components/youtube/YouTubeMusicButton";
import YouTubeMusicSearchSheet from "@/components/youtube/YouTubeMusicSearchSheet";

// This is a wrapper component that adds Spotify functionality while maintaining
// all existing functionality of the original Room component
const SpotifyRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // Get music context
  const { 
    currentTrack, queue, isPlaying, currentTime, volume,
    users, togglePlayPause, nextTrack, prevTrack, seek, setVolume,
    leaveRoom, messages, sendChatMessage, reactions, sendReaction, addSongByUrl,
    joinRoom, playTrack, roomId: contextRoomId, addToQueue
  } = useMusic();
  
  // Get Spotify context - update property names
  const { token: spotifyToken, setToken: setSpotifyToken } = useSpotify();
  
  // State for UI elements
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [isSpotifyOpen, setIsSpotifyOpen] = useState(false);
  const [isYouTubeMusicOpen, setIsYouTubeMusicOpen] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [joinAttempted, setJoinAttempted] = useState(false);
  
  // Join room on mount if roomId is available - only once
  useEffect(() => {
    let isMounted = true;
    
    // If we're already in this room, don't try to join again
    if (roomId && contextRoomId === roomId) {
      if (isMounted) {
        setHasJoinedRoom(true);
        setIsLoading(false);
      }
      return;
    }
    
    // Only attempt to join once per mount cycle
    if (roomId && !hasJoinedRoom && !joinAttempted) {
      setIsLoading(true);
      setJoinAttempted(true);
      const userName = localStorage.getItem("userName") || "Guest";
      console.log(`Attempting to join room ${roomId} as ${userName}`);
      
      joinRoom(roomId, userName)
        .then(success => {
          if (!isMounted) return;
          
          if (success) {
            console.log("Successfully joined room");
            setHasJoinedRoom(true);
          } else {
            console.error("Failed to join room");
            setHasError(true);
            toast({
              title: "Room Error",
              description: "Failed to join the room. Please try again.",
              variant: "destructive"
            });
          }
        })
        .catch(error => {
          if (!isMounted) return;
          console.error("Error joining room:", error);
          setHasError(true);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else if (!roomId) {
      setIsLoading(false);
    }
    
    // Handle room leaving on component unmount
    return () => {
      isMounted = false;
      if (hasJoinedRoom && roomId && contextRoomId === roomId) {
        console.log("Leaving room on unmount");
        leaveRoom();
      }
    };
  }, [roomId, joinRoom, leaveRoom, hasJoinedRoom, contextRoomId, joinAttempted]);

  // Handle leaving room
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
  
  // Toggle Spotify search sheet
  const toggleSpotifySearch = useCallback(() => {
    setIsSpotifyOpen(prev => !prev);
  }, []);

  // Toggle YouTube Music search sheet
  const toggleYouTubeMusicSearch = useCallback(() => {
    setIsYouTubeMusicOpen(prev => !prev);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <h2 className="text-2xl font-bold mb-4">Connecting to Room...</h2>
        <p className="text-muted-foreground">Please wait while we connect you to the room.</p>
      </div>
    );
  }
  
  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <h2 className="text-2xl font-bold mb-4 text-destructive">Connection Error</h2>
        <p className="text-muted-foreground mb-6">Could not connect to music room.</p>
        <button 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => navigate("/")}
        >
          Return to Home
        </button>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
        {/* Header */}
        <RoomHeader roomId={roomId} theme={theme} toggleTheme={toggleTheme} />

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

        {/* Footer with Spotify Button and YouTube Music Button Added */}
        <div className="py-4 px-6 border-t bg-background/80 backdrop-blur-sm">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsQueueOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span className="sr-only">Queue</span>
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsChatOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="sr-only">Chat</span>
            </Button>
            
            {/* Spotify Button */}
            <SpotifyButton onClick={toggleSpotifySearch} />
            
            {/* New YouTube Music Button */}
            <YouTubeMusicButton onClick={toggleYouTubeMusicSearch} />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsAddSongOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span className="sr-only">Add</span>
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsUsersOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="sr-only">Users</span>
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleLeaveRoom}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="sr-only">Leave</span>
            </Button>
          </div>
        </div>

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
        
        {/* Spotify Search Sheet */}
        <SpotifySearchSheet
          isOpen={isSpotifyOpen}
          onOpenChange={setIsSpotifyOpen}
          onAddTrack={addToQueue}
          onPlayTrack={playTrack}
          spotifyToken={spotifyToken}
          roomId={roomId}
        />
        
        {/* YouTube Music Search Sheet (New) */}
        <YouTubeMusicSearchSheet
          isOpen={isYouTubeMusicOpen}
          onOpenChange={setIsYouTubeMusicOpen}
          onAddTrack={addToQueue}
          onPlayTrack={playTrack}
          roomId={roomId}
        />
      </div>
    </TooltipProvider>
  );
};

export default SpotifyRoom;
