import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, onChildAdded, push } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5yh87jmgi3iZCOEZN8rlyNbLkcXsTg", // Nota: Deberías proteger tus llaves después
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

// Detectar estado del usuario
onAuthStateChanged(auth, user => {
  if(user){
    userActual = user;
    listenGlobalChat();
    showFeed(); // Mostrar algo al iniciar
  } else {
    signInAnonymously(auth);
  }
});

// ---------- CHAT GLOBAL ----------

function sendGlobalMessage(){
  if(!userActual) return;

  const input = document.getElementById("globalInput");
  const text = input.value.trim();
  if(!text) return;

  const chatRef = ref(db, "globalChat");

  push(chatRef, {
    user: userActual.displayName || "Anónimo",
    text: text,
    time: Date.now(),
    uid: userActual.uid
  });

  input.value = "";
}

function listenGlobalChat(){
  const chatBox = document.getElementById("globalChatBox");
  chatBox.innerHTML = "";
  const chatRef = ref(db, "globalChat");

  onChildAdded(chatRef, snap => {
    const msg = snap.val();
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<b>${msg.user.substring(0,5)}...:</b> ${msg.text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// ---------- NAVEGACIÓN ----------

function showFeed(){
  feed.innerHTML = `
    <div style="padding:20px text-align:center;">
      <h2>🚀 Feed principal</h2>
      <p>Aquí aparecerá el arte de la comunidad muy pronto.</p>
    </div>`;
}

function showUpload(){
  feed.innerHTML = `
    <div style="padding:20px text-align:center;">
      <h2>📤 Subir Arte</h2>
      <input type="file" id="fileInput" style="margin-bottom:10px;"><br>
      <button class="btn-main">Publicar</button>
    </div>`;
}

// ---------- ASIGNACIÓN DE EVENTOS (CRUCIAL) ----------

document.getElementById("btnSendChat").addEventListener("click", sendGlobalMessage);
document.getElementById("btnFeed").addEventListener("click", showFeed);
document.getElementById("btnUpload").addEventListener("click", showUpload);
document.getElementById("btnLogout").addEventListener("click", () => signOut(auth));

// Permitir enviar mensaje con la tecla Enter
document.getElementById("globalInput").addEventListener("keypress", (e) => {
  if (e.key === 'Enter') sendGlobalMessage();
});
