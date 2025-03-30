
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Room from "./pages/Room";
import NotFound from "./pages/NotFound";
import { MusicProvider } from "./contexts/MusicContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <TooltipProvider>
            <MusicProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/room/:roomId" element={<Room />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner position="top-right" />
            </MusicProvider>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
