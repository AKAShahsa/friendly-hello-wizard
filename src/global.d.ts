
import "canvas-confetti";

declare global {
  interface Window {
    confetti: import("canvas-confetti").CreateTypes;
  }
}

export {};
