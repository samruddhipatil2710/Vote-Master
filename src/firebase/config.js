// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBGkd7lQyEi4qQzTb-RsX-NSlsnY8vI7TM",
  authDomain: "vote-master-33611.firebaseapp.com",
  projectId: "vote-master-33611",
  storageBucket: "vote-master-33611.firebasestorage.app",
  messagingSenderId: "562114669924",
  appId: "1:562114669924:web:bcd9b4bc3617fd341b5e71"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (without persistence to avoid warnings)
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;
