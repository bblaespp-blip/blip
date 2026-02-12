import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA5yh8J7Mgij3iZCOEZ2N8r1yhDkLcXsTg",
    authDomain: "almacenamiento-redsocial.firebaseapp.com",
    databaseURL: "https://almacenamiento-redsocial-default-rtdb.firebaseio.com",
    projectId: "almacenamiento-redsocial",
    storageBucket: "almacenamiento-redsocial.appspot.com",
    appId: "1:562861595597:web:a88c0af7d0c8da44a9c284"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let userActual = null;

const CLOUD_NAME = "dz9s37bk0"; 
const PRESET = "blip_unsigned"; 

// --- FUNCIONES SOCIALES ---
window.darLike = async (postId, currentLikes) => {
    if (!userActual) return alert("Inicia sesión para dar like");
    await update(ref(db, `posts/${postId}`), { likes: (currentLikes || 0) + 1 });
};

window.toggleComentarios = (postId) => {
    const box = document.getElementById(`box-${postId}`);
    if (box) {
        box.classList.toggle('active');
        box.style.display = box.classList.contains('active') ? 'block' : 'none';
    }
};

window.enviarComentario = async (postId) => {
    if (!userActual) return alert("Inicia sesión para comentar");
    const input = document.getElementById(`input-${postId}`);
    if (!input || !input.value.trim()) return;

    await push(ref(db, `posts/${postId}/comentarios`), {
        usuario: userActual.email.split('@')[0],
        texto: input.value,
        timestamp: Date.now()
    });
    input.value = "";
};

window.seguirArtista = async (artistaId, artistaNombre) => {
    if (!userActual) return alert("Inicia sesión para seguir");
    if (userActual.uid === artistaId) return alert("No puedes seguirte a ti mismo");
    await update(ref(db, `users/${userActual.uid}/siguiendo/${artistaId}`), { nombre: artistaNombre });
    alert(`Siguiendo a ${artistaNombre}`);
};

// --- RENDER FEED ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const nombre = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        
        let listaComentarios = "";
        if (d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                listaComentarios += `<div class="comment-item"><b>${c.usuario}:</b> ${c.texto}</div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p class="artist-tag">@${nombre}</p>
                <div class="social-bar">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComentarios('${id}')">💬</button>
                    <button onclick="seguirArtista('${d.userId}', '${nombre}')" class="follow-btn">Seguir</button>
                </div>
                <div id="box-${id}" class="comment-section" style="display:none;">
                    <div class="comment-list">${listaComentarios}</div>
                    <div class="comment-input">
                        <input type="text" id="input-${id}" placeholder="Escribe un comentario...">
                        <button onclick="enviarComentario('${id}')">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// --- AUTH & UPLOAD (Igual que antes) ---
onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    if(!file || !title) return alert("Falta info");
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();

    if(data.secure_url) {
        await push(ref(db, 'posts'), {
            url: data.secure_url,
            title: title,
            userId: userActual.uid,
            userEmail: userActual.email,
            likes: 0,
            timestamp: serverTimestamp()
        });
        document.getElementById('modalUpload').style.display = 'none';
    }
};

document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : (document.getElementById('modalAuth').style.display = 'flex');
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';
document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => createUserWithEmailAndPassword(auth, e, p));
    document.getElementById('modalAuth').style.display = 'none';
};
