
import React from "react";
import { Button } from "@/components/ui/button";
import { Music, MessageSquare, Users, Link, X } from "lucide-react";

interface RoomFooterProps {
  setIsQueueOpen: (isOpen: boolean) => void;
  setIsChatOpen: (isOpen: boolean) => void;
  setIsUsersOpen: (isOpen: boolean) => void;
  setIsAddSongOpen: (isOpen: boolean) => void;
  handleLeaveRoom: () => void;
  queueLength: number;
  messagesLength: number;
  activeUsersLength: number;
}

const RoomFooter: React.FC<RoomFooterProps> = ({
  setIsQueueOpen,
  setIsChatOpen,
  setIsUsersOpen,
  setIsAddSongOpen,
  handleLeaveRoom,
  queueLength,
  messagesLength,
  activeUsersLength
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-around p-4 bg-background/80 backdrop-blur-sm border-t">
      <Button variant="outline" onClick={() => setIsQueueOpen(true)}>
        <Music className="h-5 w-5 mr-2" />
        <span className="sr-md:not-sr-only">Queue</span>
        <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-xs">
          {queueLength}
        </span>
      </Button>
      <Button variant="outline" onClick={() => setIsChatOpen(true)}>
        <MessageSquare className="h-5 w-5 mr-2" />
        <span className="sr-md:not-sr-only">Chat</span>
        <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-xs">
          {messagesLength}
        </span>
      </Button>
      <Button variant="outline" onClick={() => setIsUsersOpen(true)}>
        <Users className="h-5 w-5 mr-2" />
        <span className="sr-md:not-sr-only">Users</span>
        <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-xs">
          {activeUsersLength}
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
  );
};

export default RoomFooter;
