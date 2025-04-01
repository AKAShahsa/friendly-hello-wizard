
import React, { memo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Crown, ShieldCheck } from "lucide-react";
import { User } from "@/types/music";
import { useMusic } from "@/contexts/MusicContext";

interface UsersSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  users: User[];
}

// Using memo to prevent unnecessary re-renders
const UsersSheet: React.FC<UsersSheetProps> = memo(({ isOpen, onOpenChange, users }) => {
  const { transferHostStatus, users: contextUsers } = useMusic();
  const [isCurrentUserHost, setIsCurrentUserHost] = useState(false);
  const userId = localStorage.getItem("userId");
  
  // Find current user to check if they're the host
  React.useEffect(() => {
    const currentUser = contextUsers.find(u => u.id === userId);
    setIsCurrentUserHost(!!currentUser?.isHost);
  }, [contextUsers, userId]);

  const handleTransferHost = (targetUserId: string) => {
    if (isCurrentUserHost && userId && targetUserId !== userId) {
      transferHostStatus(targetUserId);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
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
                    <div className="flex items-center gap-2">
                      {isCurrentUserHost && user.id !== userId && (
                        <button 
                          className="p-1 text-xs bg-primary/20 hover:bg-primary/30 rounded text-primary flex items-center gap-1"
                          onClick={() => handleTransferHost(user.id)}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          <span>Make Host</span>
                        </button>
                      )}
                      <div className={`h-3 w-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
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
  );
});

UsersSheet.displayName = "UsersSheet";

export default UsersSheet;
