import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, onChildAdded, push } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// Configuración de tu proyecto Firebase
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

// Credenciales de Cloudinary
const cloudName = "dz9s37bk0";
const uploadPreset = "blip_unsigned";

// --- SEGURIDAD Y AUTENTICACIÓN ---
onAuthStateChanged(auth, user => {
  if(user){
    userActual = user;
    console.log("Sesión activa:", user.uid);
    listenGlobalChat();
    showFeed(); 
  } else {
    signInAnonymously(auth).catch(err => console.error("Error Auth:", err));
  }
});

// --- SISTEMA DE CHAT ---
function sendGlobalMessage(){
  const input = document.getElementById("globalInput");
  const text = input.value.trim();
  if(!text || !userActual) return;

  push(ref(db, "globalChat"), {
    user: "User_" + userActual.uid.substring(0,4),
    text: text,
    time: Date.now()
  });
  input.value = "";
}

function listenGlobalChat(){
  const chatBox = document.getElementById("globalChatBox");
  if(!chatBox) return;
  
  chatBox.innerHTML = ""; // Limpiar antes de cargar
  onChildAdded(ref(db, "globalChat"), snap => {
    const msg = snap.val();
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.style.marginBottom = "5px";
    div.innerHTML = `<b style="color:#7c7cff;">${msg.user}:</b> ${msg.text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// --- SUBIDA A CLOUDINARY Y GUARDADO EN FIREBASE ---
function openCloudinaryWidget() {
  if (!userActual) {
    alert("Espera a que el sistema te reconozca...");
    return;
  }

  window.cloudinary.openUploadWidget({
    cloudName: cloudName,
    uploadPreset: uploadPreset,
    sources: ['local', 'camera'],
    theme: "purple"
  }, (error, result) => {
    if (!error && result && result.event === "success") {
      // Guardamos la URL en la base de datos de Firebase
      push(ref(db, "posts"), {
        user: "Artista_" + userActual.uid.substring(0,4),
        image: result.info.secure_url,
        time: Date.now()
      });
      alert("¡Arte publicado con éxito!");
      showFeed(); 
    }
  });
}

// --- VISTAS DINÁMICAS ---
window.showFeed = function() {
  feed.innerHTML = "<h2>🚀 Galería de la Comunidad</h2><div id='galeria' style='display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:15px; padding:10px;'></div>";
  const galeria = document.getElementById("galeria");
  
  onChildAdded(ref(db, "posts"), snap => {
    const post = snap.val();
    const card = document.createElement("div");
    card.style = "background:#1a1a1a; padding:10px; border-radius:10px; border: 1px solid #333;";
    card.innerHTML = `
        <img src="${post.image}" style="width:100%; border-radius:8px; display:block;">
        <p style="margin-top:10px; font-size:12px; color:#7c7cff;">Por: ${post.user}</p>
    `;
    galeria.prepend(card);
  });
};

window.showUpload = function() {
  feed.innerHTML = `
    <div style="text-align:center; padding:60px; background:#111; border-radius:20px; border: 1px dashed #7c7cff; margin:20px;">
      <h2>📤 Publicar nueva obra</h2>
      <p>Sube tu creación a la red de BLIP</p>
      <button id="btnRealUpload" style="padding:15px 30px; background:#7c7cff; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; margin-top:20px;">
        Seleccionar Imagen
      </button>
    </div>`;
};

// --- CONFIGURACIÓN DE EVENTOS ---
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnFeed").onclick = showFeed;
  document.getElementById("btnUpload").onclick = showUpload;
  document.getElementById("btnLogout").onclick = () => signOut(auth);
  
  const btnChat = document.getElementById("btnSendChat");
  if(btnChat) btnChat.onclick = sendGlobalMessage;

  const chatInput = document.getElementById("globalInput");
  if(chatInput) {
    chatInput.onkeypress = (e) => {
      if(e.key === "Enter") sendGlobalMessage();
    };
  }

  document.addEventListener("click", (e) => {
    if(e.target && e.target.id === "btnRealUpload") {
      openCloudinaryWidget();
    }
  });
});
