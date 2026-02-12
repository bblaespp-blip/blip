import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

// --- FUNCIONES GLOBALES (Para que funcionen los onclick en el HTML inyectado) ---
window.darLike = async (id, likes) => {
    if (!userActual) return alert("Inicia sesión para dar like");
    await update(ref(db, `posts/${id}`), { likes: (likes || 0) + 1 });
};

window.toggleComs = (id) => {
    const el = document.getElementById(`box-${id}`);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.addComentario = async (id) => {
    const input = document.getElementById(`input-${id}`);
    if (!userActual || !input.value.trim()) return;
    await push(ref(db, `posts/${id}/comentarios`), {
        usuario: userActual.email.split('@')[0],
        texto: input.value
    });
    input.value = "";
};

// --- CARGAR FEED (Actualizado para mostrar interacciones) ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const autor = d.userEmail.split('@')[0];
        
        // Procesar comentarios guardados
        let comsHtml = "";
        if(d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                comsHtml += `<div style="margin-bottom:5px;"><b>${c.usuario}:</b> ${c.texto}</div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p>@${autor}</p>
                <div class="social-actions">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComs('${id}')">💬 Comentar</button>
                </div>
                <div id="box-${id}" class="comments-box" style="display:none;">
                    <div class="comments-list">${comsHtml || "Sin comentarios"}</div>
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <input type="text" id="input-${id}" placeholder="Escribe..." style="margin:0; padding:5px; font-size:0.8rem;">
                        <button onclick="addComentario('${id}')" style="background:#7b5cff; border:none; color:white; border-radius:5px; padding:0 10px;">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// --- SUBIDA DE IMAGEN ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const titleInput = document.getElementById('postTitle');
    const btn = document.getElementById('btnDoUpload');

    if(!file || !titleInput.value) return alert("Selecciona imagen y pon título");
    btn.innerText = "Subiendo...";

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if(data.secure_url) {
            await push(ref(db, 'posts'), {
                url: data.secure_url,
                title: titleInput.value,
                userEmail: userActual.email,
                likes: 0,
                timestamp: Date.now()
            });
            document.getElementById('modalUpload').style.display = 'none';
            titleInput.value = "";
        }
    } catch (e) { alert("Error al subir"); }
    btn.innerText = "Publicar Ahora";
};

// --- MANEJO DE SESIÓN ---
onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : (document.getElementById('modalAuth').style.display = 'flex');
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';
document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => createUserWithEmailAndPassword(auth, e, p));
    document.getElementById('modalAuth').style.display = 'none';
};
