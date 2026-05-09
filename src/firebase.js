import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBspaGosSpngSbdy44JOuqK-_diA7mbM-s",
  authDomain: "vedinzen-665c6.firebaseapp.com",
  projectId: "vedinzen-665c6",
  storageBucket: "vedinzen-665c6.firebasestorage.app",
  messagingSenderId: "420318614460",
  appId: "1:420318614460:web:2ffb2ca3607e13fb0011b9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);