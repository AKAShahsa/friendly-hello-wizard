
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { MusicProvider } from "@/contexts/MusicContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SpotifyProvider } from "@/contexts/SpotifyContext";
import Index from "@/pages/Index";
import Room from "@/pages/Room";
import SpotifyRoom from "@/pages/SpotifyRoom";
import NotFound from "@/pages/NotFound";
import "./App.css";

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <MusicProvider>
        <SpotifyProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/room/:roomId" element={<SpotifyRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </SpotifyProvider>
      </MusicProvider>
    </ThemeProvider>
  );
}

export default App;
