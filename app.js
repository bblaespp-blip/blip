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

// --- CONTROL DE USUARIO ---
onAuthStateChanged(auth, user => {
  if(user){
    userActual = user;
    listenGlobalChat();
    showFeed(); 
  } else {
    signInAnonymously(auth);
  }
});

// --- CHAT GLOBAL ---
function sendGlobalMessage(){
  const input = document.getElementById("globalInput");
  const text = input.value.trim();
  if(!text || !userActual) return;

  push(ref(db, "globalChat"), {
    user: "Usuario " + userActual.uid.substring(0,4),
    text: text,
    time: Date.now()
  });
  input.value = "";
}

function listenGlobalChat(){
  const chatBox = document.getElementById("globalChatBox");
  onChildAdded(ref(db, "globalChat"), snap => {
    const msg = snap.val();
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<b>${msg.user}:</b> ${msg.text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// --- CLOUDINARY & FEED ---
const cloudName = "dz9s37bk0";
const uploadPreset = "blip_unsigned";

function openCloudinaryWidget() {
  window.cloudinary.openUploadWidget({
    cloudName: cloudName,
    uploadPreset: uploadPreset,
    sources: ['local', 'camera'],
    theme: "purple"
  }, (error, result) => {
    if (!error && result && result.event === "success") {
      push(ref(db, "posts"), {
        user: "Artista " + userActual.uid.substring(0,4),
        image: result.info.secure_url,
        time: Date.now()
      });
      alert("¡Imagen publicada!");
      showFeed();
    }
  });
}

window.showFeed = function() {
  feed.innerHTML = "<h2>🚀 Galería</h2><div id='galeria' style='display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:10px;'></div>";
  const galeria = document.getElementById("galeria");
  onChildAdded(ref(db, "posts"), snap => {
    const post = snap.val();
    const img = document.createElement("img");
    img.src = post.image;
    img.style.width = "100%";
    img.style.borderRadius = "8px";
    galeria.prepend(img);
  });
};

window.showUpload = function() {
  feed.innerHTML = `
    <div style="text-align:center; padding:50px;">
      <h2>📤 Sube tu Arte</h2>
      <button id="btnRealUpload" style="padding:15px; background:#7c7cff; border:none; color:white; border-radius:8px; cursor:pointer;">Seleccionar archivo</button>
    </div>`;
};

// --- EVENTOS ---
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnFeed").onclick = () => showFeed();
  document.getElementById("btnUpload").onclick = () => showUpload();
  document.getElementById("btnLogout").onclick = () => signOut(auth);
  document.getElementById("btnSendChat").onclick = sendGlobalMessage;
  
  // Delegación para el botón dinámico de subida
  document.addEventListener("click", (e) => {
    if(e.target && e.target.id === "btnRealUpload") openCloudinaryWidget();
  });
});
