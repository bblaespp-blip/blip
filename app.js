// --- Lógica del Modal (Pon esto al principio de tu app.js para probar) ---
const modalUpload = document.getElementById('modalUpload');
const btnOpenUpload = document.getElementById('btnOpenUpload');

// Función única para abrir
const abrirModal = () => {
    console.log("Intentando abrir modal..."); // Mira la consola (F12) para ver si esto sale
    modalUpload.style.display = 'flex';
};

// Asignación directa
btnOpenUpload.addEventListener('click', abrirModal);

// --- En tu onAuthStateChanged ---
onAuthStateChanged(auth, user => {
    userActual = user;
    if (user) {
        btnOpenUpload.style.display = 'block';
        btnOpenUpload.onclick = abrirModal; // Refuerzo
        
        const username = user.email.split('@')[0];
        document.getElementById('btnLogin').innerText = `@${username}`;
        document.getElementById('btnLogin').onclick = () => verPerfil(user.uid, username);
    } else {
        btnOpenUpload.style.display = 'none';
        document.getElementById('btnLogin').innerText = 'Entrar';
        document.getElementById('btnLogin').onclick = () => document.getElementById('modalAuth').style.display = 'flex';
    }
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, serverTimestamp, set } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

// --- 1. BUSCADOR DE PERFILES ---
const searchInput = document.getElementById('userSearch');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.card').forEach(card => {
            const username = card.querySelector('.info p').innerText.toLowerCase();
            card.style.display = username.includes(term) ? 'block' : 'none';
        });
    });
}

// --- 2. COMENTARIOS ---
window.enviarComentario = async (postId, texto, input) => {
    if (!userActual) return alert("Inicia sesión para comentar");
    if (!texto.trim()) return;
    try {
        await push(ref(db, `posts/${postId}/comments`), {
            usuario: userActual.email.split('@')[0],
            texto: texto,
            timestamp: serverTimestamp()
        });
        input.value = ""; 
    } catch (e) { console.error(e); }
};

// --- 3. FEED ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(child => {
        const postId = child.key;
        const d = child.val();
        const autor = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p onclick="verPerfil('${d.userId}', '${autor}')" style="color:#7b5cff; cursor:pointer;">@${autor}</p>
            </div>
            <div class="comments-area">
                <div id="comments-list-${postId}" class="comments-display" style="max-height:80px; overflow-y:auto; font-size:0.8rem; color:#ddd;"></div>
                <input type="text" placeholder="Comentar..." onkeydown="if(event.key==='Enter') enviarComentario('${postId}', this.value, this)">
            </div>`;
        
        onValue(ref(db, `posts/${postId}/comments`), commSnap => {
            const listDiv = document.getElementById(`comments-list-${postId}`);
            if (listDiv) {
                listDiv.innerHTML = "";
                commSnap.forEach(c => {
                    const cData = c.val();
                    listDiv.innerHTML += `<div><b style="color:#7b5cff;">${cData.usuario}:</b> ${cData.texto}</div>`;
                });
                listDiv.scrollTop = listDiv.scrollHeight;
            }
        });
        feed.prepend(card);
    });
});

// --- 4. SUBIDA (MODAL) ---
const modalUpload = document.getElementById('modalUpload');
document.getElementById('btnOpenUpload').onclick = () => modalUpload.style.display = 'flex';

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    if(!file || !title || !userActual) return alert("Faltan datos");

    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if(data.secure_url) {
            await push(ref(db, 'posts'), {
                url: data.secure_url, title: title, userId: userActual.uid, userEmail: userActual.email, timestamp: serverTimestamp()
            });
            modalUpload.style.display = 'none';
        }
    } catch (e) { alert("Error al subir"); }
    btn.innerText = "Publicar"; btn.disabled = false;
};

// --- 5. SESIÓN ---
onAuthStateChanged(auth, user => {
    userActual = user;
    const btnLogin = document.getElementById('btnLogin');
    const btnUpload = document.getElementById('btnOpenUpload');
    if (user) {
        const username = user.email.split('@')[0];
        btnUpload.style.display = 'block';
        btnLogin.innerText = `@${username}`;
        btnLogin.onclick = () => verPerfil(user.uid, username);
    } else {
        btnUpload.style.display = 'none';
        btnLogin.innerText = 'Entrar';
        btnLogin.onclick = () => document.getElementById('modalAuth').style.display = 'flex';
    }
});

document.getElementById('btnDoAuth').onclick = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch (err) {
        const cred = await createUserWithEmailAndPassword(auth, e, p);
        await set(ref(db, `users/${cred.user.uid}`), { username: e.split('@')[0], bio: "Nuevo artista", seguidores: 0 });
    }
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnHome').onclick = () => location.reload();

