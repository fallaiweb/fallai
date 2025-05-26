// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPf_EoIxzFhArc83GBaIy7h--2Kye0T3E",
  authDomain: "fallai-e4e92.firebaseapp.com",
  projectId: "fallai-e4e92",
  storageBucket: "fallai-e4e92.firebasestorage.app",
  messagingSenderId: "1:1015085978833:web:3a51e6320a94c80bbc21f0",
  appId: "G-QZEKMEE5CW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, signInWithPopup, signOut, db, doc, setDoc, getDoc, updateDoc };
