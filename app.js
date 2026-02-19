import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, onChildAdded, push } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA5yh87jmgi3iZCOEZN8rlyNbLkcXsTg",
  authDomain: "almacenamiento-redsocial.firebaseapp.com",
  databaseURL: "https://almacenamiento-redsocial-default-rtdb.firebaseio.com",
  projectId: "almacenamiento-redsocial",
  storageBucket: "almacenamiento-redsocial.appspot.com",
  messagingSenderId: "152681595597",
  appId: "1:152681595597:web:a88c0af7d0c8ad4a9c284"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let userActual = null;
const feed = document.getElementById("feed");

const cloudName = "dz9s37bk0";
const uploadPreset = "blip_unsigned";

// =================== AUTH ===================

onAuthStateChanged(auth, user => {
  if (user) {
    userActual = user;
    listenGlobalChat();
    showFeed();
  } else {
    signInAnonymously(auth);
  }
});

// =================== CHAT GLOBAL ===================

window.sendGlobalMessage = function () {
  const input = document.getElementById("globalInput");
  const text = input.value.trim();
  if (!text || !userActual) return;

  push(ref(db, "globalChat"), {
    user: "User_" + userActual.uid.substring(0, 4),
    text,
    time: Date.now()
  });

  input.value = "";
};

function listenGlobalChat() {
  const chatBox = document.getElementById("globalChatBox");
  if (!chatBox) return;

  chatBox.innerHTML = "";

  onChildAdded(ref(db, "globa
