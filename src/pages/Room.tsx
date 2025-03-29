
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX,
  Users, MessageSquare, Music, Moon, Sun, Home, Send, X, Heart, 
  ThumbsUp, Smile, Crown, Link
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

// Format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { 
    currentTrack, queue, isPlaying, currentTime, volume,
    users, togglePlayPause, nextTrack, prevTrack, seek, setVolume,
    leaveRoom, messages, sendChatMessage, reactions, sendReaction, addSongByUrl
  } = useMusic();
  const [message, setMessage] = useState("");
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [songUrl, setSongUrl] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(message);
      setMessage("");
    }
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (songUrl.trim()) {
      addSongByUrl(songUrl, songTitle.trim() || undefined, songArtist.trim() || undefined)
        .then(success => {
          if (success) {
            setSongUrl("");
            setSongTitle("");
            setSongArtist("");
            setIsAddSongOpen(false);
          }
        });
    } else {
      toast({
        title: "Missing URL",
        description: "Please enter a song URL",
        variant: "destructive"
      });
    }
  };

  const activeUsers = users.filter(user => user.isActive);
  const hostUser = users.find(user => user.isHost);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <Home className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Room: {roomId}</h1>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        {/* Album Art and Track Info */}
        <div className="w-full max-w-md mx-auto mb-8">
          {currentTrack ? (
            <>
              <div className="mb-6 rounded-lg overflow-hidden shadow-xl">
                <AspectRatio ratio={1/1}>
                  <img 
                    src={currentTrack.coverUrl} 
                    alt={`${currentTrack.title} by ${currentTrack.artist}`} 
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-700"
                  />
                </AspectRatio>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold truncate">{currentTrack.title}</h2>
                <p className="text-muted-foreground truncate">{currentTrack.artist}</p>
                <p className="text-sm text-muted-foreground">{currentTrack.album}</p>
              </div>
            </>
          ) : (
            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
              <Music className="h-20 w-20 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Reaction Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => sendReaction("thumbsUp")}
            className="flex flex-col items-center"
          >
            <ThumbsUp className="h-5 w-5" />
            <span className="text-xs mt-1">{reactions.thumbsUp}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => sendReaction("heart")}
            className="flex flex-col items-center"
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs mt-1">{reactions.heart}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => sendReaction("smile")}
            className="flex flex-col items-center"
          >
            <Smile className="h-5 w-5" />
            <span className="text-xs mt-1">{reactions.smile}</span>
          </Button>
        </div>

        {/* Player Controls */}
        <div className="w-full max-w-md mx-auto">
          {/* Progress Bar */}
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs">{formatTime(currentTime)}</span>
            <Slider 
              value={[currentTime]} 
              max={currentTrack?.duration || 100}
              step={1}
              onValueChange={(value) => seek(value[0])}
              className="flex-1"
            />
            <span className="text-xs">{formatTime(currentTrack?.duration || 0)}</span>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={prevTrack}>
              <SkipBack className="h-6 w-6" />
            </Button>
            <Button 
              className="h-14 w-14 rounded-full" 
              onClick={togglePlayPause}
              disabled={!currentTrack}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={nextTrack}>
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setVolume(volume === 0 ? 0.7 : 0)}>
              {volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider 
              value={[volume * 100]} 
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0] / 100)}
              className="flex-1"
            />
          </div>
        </div>
      </main>

      {/* Sidebar Triggers */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-around p-4 bg-background/80 backdrop-blur-sm border-t">
        <Button variant="outline" onClick={() => setIsQueueOpen(true)}>
          <Music className="h-5 w-5 mr-2" />
          <span className="sr-md:not-sr-only">Queue</span>
          <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-xs">
            {queue.length}
          </span>
        </Button>
        <Button variant="outline" onClick={() => setIsChatOpen(true)}>
          <MessageSquare className="h-5 w-5 mr-2" />
          <span className="sr-md:not-sr-only">Chat</span>
          <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-xs">
            {messages.length}
          </span>
        </Button>
        <Button variant="outline" onClick={() => setIsUsersOpen(true)}>
          <Users className="h-5 w-5 mr-2" />
          <span className="sr-md:not-sr-only">Users</span>
          <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-xs">
            {activeUsers.length}
          </span>
        </Button>
        <Button variant="outline" onClick={() => setIsAddSongOpen(true)}>
          <Link className="h-5 w-5 mr-2" />
          <span className="sr-md:not-sr-only">Add URL</span>
        </Button>
        <Button variant="destructive" onClick={handleLeaveRoom}>
          <X className="h-5 w-5 mr-2" />
          <span className="sr-md:not-sr-only">Leave</span>
        </Button>
      </div>

      {/* Queue Sheet */}
      <Sheet open={isQueueOpen} onOpenChange={setIsQueueOpen}>
        <SheetContent side="left">
          <div className="h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Queue</h2>
            <ScrollArea className="flex-1">
              {queue.length > 0 ? (
                <div className="space-y-3">
                  {queue.map(track => (
                    <div 
                      key={track.id}
                      className={`flex items-center gap-3 p-2 rounded-md ${
                        currentTrack?.id === track.id ? "bg-primary/10" : "hover:bg-secondary/80"
                      }`}
                    >
                      <img 
                        src={track.coverUrl} 
                        alt={track.title} 
                        className="h-12 w-12 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{track.title}</div>
                        <div className="text-sm text-muted-foreground truncate">{track.artist}</div>
                      </div>
                      {currentTrack?.id === track.id && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No tracks in queue</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Users Sheet */}
      <Sheet open={isUsersOpen} onOpenChange={setIsUsersOpen}>
        <SheetContent side="right">
          <div className="h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Users</h2>
            <ScrollArea className="flex-1">
              {users.length > 0 ? (
                <div className="space-y-3">
                  {users.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/80"
                    >
                      <Avatar>
                        <AvatarFallback>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 font-medium">
                        {user.name}
                        {user.isHost && (
                          <span className="ml-2 inline-flex items-center">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            <span className="text-xs ml-1 text-muted-foreground">Host</span>
                          </span>
                        )}
                      </div>
                      <div className={`h-3 w-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No users in room</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat Sheet */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="left">
          <div className="h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Chat</h2>
            <ScrollArea className="flex-1 mb-4">
              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg, index) => (
                    <div 
                      key={index}
                      className="flex flex-col"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{msg.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="pl-2 py-1">{msg.text}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No messages yet</p>
                </div>
              )}
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Song Sheet */}
      <Sheet open={isAddSongOpen} onOpenChange={setIsAddSongOpen}>
        <SheetContent>
          <div className="h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Add Song by URL</h2>
            <form onSubmit={handleAddSong} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="song-url">Audio URL (required)</Label>
                <Input
                  id="song-url"
                  value={songUrl}
                  onChange={(e) => setSongUrl(e.target.value)}
                  placeholder="https://example.com/song.mp3"
                  className="flex-1"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="song-title">Song Title (optional)</Label>
                <Input
                  id="song-title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="Enter song title"
                  className="flex-1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="song-artist">Artist Name (optional)</Label>
                <Input
                  id="song-artist"
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  placeholder="Enter artist name"
                  className="flex-1"
                />
              </div>
              
              <div className="pt-4">
                <Button type="submit" className="w-full">
                  Add to Queue
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Room;
