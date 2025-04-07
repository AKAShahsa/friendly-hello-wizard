
import React from "react";
import { Button } from "@/components/ui/button";
import { Youtube } from "lucide-react";

interface YouTubeMusicButtonProps {
  onClick: () => void;
}

const YouTubeMusicButton: React.FC<YouTubeMusicButtonProps> = ({ onClick }) => {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className="flex items-center justify-center relative overflow-hidden hover:bg-red-100 hover:text-red-500 transition-colors"
    >
      <Youtube className="h-5 w-5 text-red-500" />
      <span className="sr-only">YouTube Music</span>
    </Button>
  );
};

export default YouTubeMusicButton;
