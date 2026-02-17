import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, onChildAdded, push } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

onAuthStateChanged(auth, user => {
  if(user){
    userActual = user;
    listenGlobalChat();
  } else {
    signInAnonymously(auth);
  }
});

// ---------- CHAT GLOBAL ----------

window.sendGlobalMessage = function(){

  if(!userActual) return;

  const input = document.getElementById("globalInput");
  const text = input.value.trim();
  if(!text) return;

  const chatRef = ref(db,"globalChat");

  push(chatRef,{
    user: userActual.displayName || "Anónimo",
    text:text,
    time:Date.now(),
    uid:userActual.uid
  });

  input.value="";
}

function listenGlobalChat(){

  const chatBox = document.getElementById("globalChatBox");
  chatBox.innerHTML="";

  const chatRef = ref(db,"globalChat");

  onChildAdded(chatRef,snap=>{
    const msg = snap.val();
    const div = document.createElement("div");
    div.className="chat-msg";
    div.innerHTML = `<b>${msg.user}:</b> ${msg.text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// ---------- FEED BÁSICO ----------

window.showFeed = function(){
  feed.innerHTML = "<h2>🚀 Feed principal listo</h2>";
}

// ---------- SUBIR (PLACEHOLDER) ----------

window.showUpload = function(){
  feed.innerHTML = "<h2>📤 Subida en desarrollo</h2>";
}

// ---------- LOGOUT ----------

window.logout = function(){
  signOut(auth);
}
