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

// Funciones para Window (Interacción)
window.darLike = async (id, currentLikes) => {
    if (!userActual) return alert("Inicia sesión para dar like");
    await update(ref(db, `posts/${id}`), { likes: (currentLikes || 0) + 1 });
};

window.toggleComentarios = (id) => {
    const box = document.getElementById(`box-${id}`);
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
};

window.enviarComentario = async (id) => {
    const input = document.getElementById(`input-${id}`);
    if (!userActual || !input.value.trim()) return;
    
    await push(ref(db, `posts/${id}/comentarios`), {
        usuario: userActual.email.split('@')[0],
        texto: input.value,
        timestamp: Date.now()
    });
    input.value = "";
};

window.seguirArtista = (nombre) => alert("Ahora sigues a " + nombre);

// Escuchar cambios en la base de datos
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = "";
    
    snap.forEach(postSnap => {
        const d = postSnap.val();
        const id = postSnap.key;
        const autor = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        
        // Procesar comentarios
        let comsHtml = "";
        if (d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                comsHtml += `<div class="com-item"><b>${c.usuario}:</b> ${c.texto}</div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p class="tag">@${autor}</p>
                <div class="actions">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComentarios('${id}')">💬</button>
                    <button onclick="seguirArtista('${autor}')" class="btn-follow">Seguir</button>
                </div>
                <div id="box-${id}" class="com-box" style="display:none;">
                    <div class="com-list">${comsHtml || '<p style="font-size:0.7rem; color:#666;">Sin comentarios aún</p>'}</div>
                    <div class="com-input">
                        <input type="text" id="input-${id}" placeholder="Escribe un comentario...">
                        <button onclick="enviarComentario('${id}')">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// Manejo de Auth
onAuthStateChanged(auth, u => {
    userActual = u;
    document.getElementById('btnOpenUpload').style.display = u ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = u ? 'Salir' : 'Entrar';
});

document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : (document.getElementById('modalAuth').style.display = 'flex');
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';

document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => createUserWithEmailAndPassword(auth, e, p));
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    if(!file || !title) return alert("Completa los campos");
    
    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        await push(ref(db, 'posts'), {
            url: data.secure_url,
            title: title,
            userEmail: userActual.email,
            userId: userActual.uid,
            likes: 0,
            timestamp: serverTimestamp()
        });
        document.getElementById('modalUpload').style.display = 'none';
    } catch (err) { alert("Error al subir"); }
    btn.innerText = "Publicar";
};
