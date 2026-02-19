import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcpVa53plT5UDQ-gPg0s2oxmIYpFh0GmQ",
  authDomain: "munchkin-companion-149fe.firebaseapp.com",
  databaseURL: "https://munchkin-companion-149fe-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "munchkin-companion-149fe",
  storageBucket: "munchkin-companion-149fe.firebasestorage.app",
  messagingSenderId: "419940313825",
  appId: "1:419940313825:web:7d3b884af89f928a9625a0",
  measurementId: "G-2G6HCEBG0M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getDatabase(app);
