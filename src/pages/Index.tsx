
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMusic } from "@/contexts/MusicContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Music, Users, Radio } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [userName, setUserName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { createRoom, joinRoom } = useMusic();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to create a room",
        variant: "destructive"
      });
      return;
    }

    if (!roomName.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a name for your room",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const roomId = await createRoom(userName);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!userName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to join a room",
        variant: "destructive"
      });
      return;
    }

    if (!roomIdToJoin.trim()) {
      toast({
        title: "Room ID required",
        description: "Please enter a room ID to join",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await joinRoom(roomIdToJoin, userName);
      if (success) {
        navigate(`/room/${roomIdToJoin}`);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "Failed to join room. Please check the room ID and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
      
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="flex items-center gap-3 mb-4">
          <Music className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold">SyncSound</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-md">
          Listen to music together with friends in real-time, no matter where you are.
        </p>
      </div>

      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>Create a new room or join an existing one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Room</TabsTrigger>
              <TabsTrigger value="join">Join Room</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="userName" className="text-sm font-medium">
                  Your Name
                </label>
                <Input
                  id="userName"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              
              <TabsContent value="create" className="space-y-2">
                <label htmlFor="roomName" className="text-sm font-medium">
                  Room Name
                </label>
                <Input
                  id="roomName"
                  placeholder="Enter room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </TabsContent>
              
              <TabsContent value="join" className="space-y-2">
                <label htmlFor="roomId" className="text-sm font-medium">
                  Room ID
                </label>
                <Input
                  id="roomId"
                  placeholder="Enter room ID"
                  value={roomIdToJoin}
                  onChange={(e) => setRoomIdToJoin(e.target.value)}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Tabs defaultValue="create" className="w-full">
            <TabsContent value="create">
              <Button 
                className="w-full" 
                disabled={isLoading}
                onClick={handleCreateRoom}
              >
                <Radio className="mr-2 h-4 w-4" />
                Create Room
              </Button>
            </TabsContent>
            <TabsContent value="join">
              <Button 
                className="w-full" 
                disabled={isLoading}
                onClick={handleJoinRoom}
              >
                <Users className="mr-2 h-4 w-4" />
                Join Room
              </Button>
            </TabsContent>
          </Tabs>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Choose a room to start listening together with friends</p>
      </div>
    </div>
  );
};

export default Index;
