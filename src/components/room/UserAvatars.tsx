
import React, { memo, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@/types/music";

interface UserAvatarsProps {
  users: User[];
}

// Using memo to prevent unnecessary re-renders
const UserAvatars: React.FC<UserAvatarsProps> = memo(({ users }) => {
  // Filter active users or include all users if none are active
  const activeUsers = users.filter(user => user.isActive);
  
  useEffect(() => {
    console.log("Users in UserAvatars:", users);
    console.log("Active users in UserAvatars:", activeUsers);
  }, [users, activeUsers]);

  if (users.length === 0) {
    return (
      <div className="py-2 flex justify-center">
        <p className="text-sm text-muted-foreground">No users in room</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <TooltipProvider>
        <ScrollArea className="w-full">
          <div className="flex space-x-2 px-4">
            {users.map((user) => (
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
      </TooltipProvider>
    </div>
  );
});

UserAvatars.displayName = "UserAvatars";

export default UserAvatars;
