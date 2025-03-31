
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useMusic } from "@/contexts/MusicContext";
import { Music } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [roomId, setRoomIdInput] = useState("");
  const [activeTab, setActiveTab] = useState("create");
  
  // Use try/catch to gracefully handle missing context
  let musicContext;
  try {
    musicContext = useMusic();
  } catch (error) {
    console.error("Error accessing music context:", error);
    // Handle missing context gracefully
    musicContext = {
      createRoom: async () => {
        toast({
          title: "Error",
          description: "Music service unavailable. Please try again later.",
          variant: "destructive"
        });
        return "";
      },
      joinRoom: async () => {
        toast({
          title: "Error",
          description: "Music service unavailable. Please try again later.",
          variant: "destructive"
        });
        return false;
      }
    };
  }
  
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);
  
  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to create a room",
        variant: "destructive"
      });
      return;
    }
    
    localStorage.setItem("userName", userName);
    
    try {
      const newRoomId = await musicContext.createRoom(userName);
      if (newRoomId) {
        navigate(`/room/${newRoomId}`);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleJoinRoom = async () => {
    if (!userName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join a room",
        variant: "destructive"
      });
      return;
    }
    
    if (!roomId.trim()) {
      toast({
        title: "Room ID Required",
        description: "Please enter a room ID to join",
        variant: "destructive"
      });
      return;
    }
    
    localStorage.setItem("userName", userName);
    
    try {
      const success = await musicContext.joinRoom(roomId, userName);
      if (success) {
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-md w-full space-y-8 p-8 rounded-xl bg-card shadow-lg border border-border">
        <div className="text-center">
          <Music className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold">Music Room</h1>
          <p className="text-muted-foreground mt-2">Listen together in real-time</p>
        </div>
        
        <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="create">Create Room</TabsTrigger>
            <TabsTrigger value="join">Join Room</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Your Name</Label>
              <Input 
                id="create-name" 
                placeholder="Enter your name" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            
            <Button className="w-full" onClick={handleCreateRoom}>
              Create Room
            </Button>
          </TabsContent>
          
          <TabsContent value="join" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-name">Your Name</Label>
              <Input 
                id="join-name" 
                placeholder="Enter your name" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="room-id">Room ID</Label>
              <Input 
                id="room-id" 
                placeholder="Enter room ID" 
                value={roomId}
                onChange={(e) => setRoomIdInput(e.target.value)}
              />
            </div>
            
            <Button className="w-full" onClick={handleJoinRoom}>
              Join Room
            </Button>
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <div className="text-center text-sm text-muted-foreground">
          <p>Share music with friends in real-time</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
