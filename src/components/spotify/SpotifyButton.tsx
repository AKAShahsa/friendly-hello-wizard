
import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Music } from "lucide-react";

interface SpotifyButtonProps {
  onClick: () => void;
  className?: string;
}

const SpotifyButton: React.FC<SpotifyButtonProps> = ({ onClick, className }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={className}
          onClick={onClick}
        >
          <Music className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Spotify Search</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SpotifyButton;
