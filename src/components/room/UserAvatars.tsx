
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@/types/music";

interface UserAvatarsProps {
  users: User[];
}

const UserAvatars: React.FC<UserAvatarsProps> = ({ users }) => {
  const activeUsers = users.filter(user => user.isActive);
  
  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className="py-2">
      <ScrollArea className="w-full">
        <div className="flex space-x-2 px-4">
          {activeUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative flex-shrink-0">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span 
                    className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
                      user.isActive ? 'bg-green-500' : 'bg-gray-400'
                    } ring-1 ring-white`} 
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name} {user.isHost ? '👑' : ''}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default UserAvatars;
