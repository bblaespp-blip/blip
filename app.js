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

  onChildAdded(ref(db, "globalChat"), snap => {
    const msg = snap.val();

    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `
      <span class="chat-user">${msg.user}</span>
      <span class="chat-text">${msg.text}</span>
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// =================== CLOUDINARY ===================

window.openCloudinaryWidget = function () {
  if (!userActual) return alert("Iniciando sesión...");

  window.cloudinary.openUploadWidget({
    cloudName,
    uploadPreset,
    sources: ["local", "camera"],
    theme: "purple"
  }, (error, result) => {
    if (!error && result && result.event === "success") {
      push(ref(db, "posts"), {
        user: "Artista_" + userActual.uid.substring(0, 4),
        image: result.info.secure_url,
        time: Date.now()
      });

      showFeed();
    }
  });
};

// =================== FEED ===================

window.showFeed = function () {
  feed.innerHTML = `<div class="feed-grid" id="galeria"></div>`;
  const galeria = document.getElementById("galeria");

  onChildAdded(ref(db, "posts"), snap => {
    const post = snap.val();

    const card = document.createElement("div");
    card.className = "post";

    card.innerHTML = `
      <img src="${post.image}" loading="lazy">
      <div class="post-footer">Por ${post.user}</div>
    `;

    galeria.prepend(card);
  });
};

// =================== UPLOAD VIEW ===================

window.showUpload = function () {
  feed.innerHTML = `
    <div class="upload-box">
      <h2>📤 Publicar nueva obra</h2>
      <p>Comparte tu arte con la comunidad BLIP</p>
      <button id="btnRealUpload">Subir imagen</button>
    </div>
  `;
};

// =================== EVENTS ===================

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("btnFeed")?.addEventListener("click", showFeed);
  document.getElementById("btnUpload")?.addEventListener("click", showUpload);
  document.getElementById("btnLogout")?.addEventListener("click", () => signOut(auth));

  document.addEventListener("click", e => {
    if (e.target.id === "btnRealUpload") openCloudinaryWidget();
  });

  const chatInput = document.getElementById("globalInput");
  chatInput?.addEventListener("keypress", e => {
    if (e.key === "Enter") sendGlobalMessage();
  });

  document.getElementById("btnSendChat")?.addEventListener("click", sendGlobalMessage);

});
