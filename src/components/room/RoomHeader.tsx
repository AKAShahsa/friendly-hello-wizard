
import React from "react";
import { Button } from "@/components/ui/button";
import { Home, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RoomHeaderProps {
  roomId: string | undefined;
  theme: string;
  toggleTheme: () => void;
}

const RoomHeader: React.FC<RoomHeaderProps> = ({ roomId, theme, toggleTheme }) => {
  const navigate = useNavigate();

  return (
    <header className="border-b px-4 py-3 flex items-center justify-between bg-background/80 backdrop-blur-sm">
      <Button variant="ghost" onClick={() => navigate("/")}>
        <Home className="h-5 w-5" />
      </Button>
      <h1 className="text-xl font-semibold">Room: {roomId}</h1>
      <Button variant="ghost" size="icon" onClick={toggleTheme}>
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </header>
  );
};

export default RoomHeader;
