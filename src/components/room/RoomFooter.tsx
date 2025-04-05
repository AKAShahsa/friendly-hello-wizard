
import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Music, MessageSquare, Users, Link, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Add horizontal scroll indicator effect on mobile
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;
    
    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      // Add visual indication for scroll position
      const isAtStart = container.scrollLeft <= 10;
      const isAtEnd = Math.abs((container.scrollWidth - container.clientWidth) - container.scrollLeft) <= 10;
      
      container.classList.toggle("scroll-start", isAtStart);
      container.classList.toggle("scroll-end", isAtEnd);
    };
    
    const container = scrollContainerRef.current;
    container.addEventListener("scroll", handleScroll);
    
    // Initialize scroll state
    handleScroll();
    
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile]);
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t">
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto py-4 px-2 scrollbar-hide"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <div className="flex space-x-3 min-w-max mx-auto">
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
      </div>
    </div>
  );
};

export default RoomFooter;
