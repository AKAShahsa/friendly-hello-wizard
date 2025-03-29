
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAUQldS8qZrUhzzKNeMzXwQ30_UZr0LlA4",
  authDomain: "music-sync-room-app.firebaseapp.com",
  projectId: "music-sync-room-app",
  storageBucket: "music-sync-room-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:1234567890abcdef123456",
  databaseURL: "https://music-sync-room-app-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { db, rtdb };
