import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCQyUdItrYFAruwiblYrCx_j9OZDmUcc8",
  authDomain: "we-grind.firebaseapp.com",
  projectId: "we-grind",
  storageBucket: "we-grind.firebasestorage.app",
  messagingSenderId: "740508009150",
  appId: "1:740508009150:web:fb130125c4bf84e61014ef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Sign in with Google
async function signIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Sign in error:', err);
  }
}

// Sign out
async function signOutUser() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

// Save deck to Firestore
async function saveDeck(deck) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'decks'), {
      userId: user.uid,
      name: deck.name,
      cards: deck.cards,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Save deck error:', err);
  }
}

// Get user's deck history
async function getDeckHistory() {
  try {
    const user = auth.currentUser;
    if (!user) return [];
    const q = query(
      collection(db, 'decks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('Get history error:', err);
    return [];
  }
}

export { auth, signIn, signOutUser, saveDeck, getDeckHistory, onAuthStateChanged };