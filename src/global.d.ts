
import { LucideIcon } from 'lucide-react';

declare global {
  interface Window {
    confetti?: (options?: any) => void;
  }
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

declare module "*.wav" {
  const src: string;
  export default src;
}

declare module "*.ogg" {
  const src: string;
  export default src;
}

export {}
