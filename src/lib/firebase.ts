
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCyWq1akBXvhlGTbDXLOoO2SjRBK5Don90",
  authDomain: "ai-music-player-2969a.firebaseapp.com",
  databaseURL: "https://ai-music-player-2969a-default-rtdb.firebaseio.com",
  projectId: "ai-music-player-2969a",
  storageBucket: "ai-music-player-2969a.firebasestorage.app",
  messagingSenderId: "121872065800",
  appId: "1:121872065800:web:d82a389d805293fb7b78bd",
  measurementId: "G-K45KXN77GC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const analytics = getAnalytics(app);

export { db, rtdb, analytics };
