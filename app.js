import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, update, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// 1. CONFIGURACIÓN (Debe ir primero para evitar el error 'not defined')
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

// 2. FUNCIONES DE INTERACCIÓN
window.darLike = async (postId, currentLikes) => {
    if (!userActual) return alert("Inicia sesión para dar like");
    await update(ref(db, `posts/${postId}`), { likes: (currentLikes || 0) + 1 });
};

window.enviarComentario = async (postId) => {
    if (!userActual) return alert("Inicia sesión para comentar");
    const input = document.getElementById(`input-${postId}`);
    if (!input.value.trim()) return;
    await push(ref(db, `posts/${postId}/comentarios`), {
        usuario: userActual.email.split('@')[0],
        texto: input.value,
        timestamp: Date.now()
    });
    input.value = "";
};

window.seguirUsuario = async (uidSeguido) => {
    if (!userActual) return alert("Inicia sesión para seguir");
    if (!uidSeguido || uidSeguido === userActual.uid) return alert("No puedes seguirte a ti mismo");
    await update(ref(db, `users/${userActual.uid}/siguiendo/${uidSeguido}`), { activo: true });
    alert("¡Artista seguido!");
};

window.borrarPost = async (postId, autorUid) => {
    if (userActual && userActual.uid === autorUid) {
        if (confirm("¿Borrar esta obra?")) await remove(ref(db, `posts/${postId}`));
    }
};

window.toggleComs = (id) => {
    const el = document.getElementById(`box-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// 3. RENDERIZADO DEL FEED
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const autorNombre = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        const autorUid = d.userId || "";
        const esMio = userActual && userActual.uid === autorUid;

        let comsHtml = "";
        if(d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                comsHtml += `<div class="comentario"><b>${c.usuario}:</b> ${c.texto}</div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>${d.title}</h3>
                    ${esMio ? `<button onclick="borrarPost('${id}', '${autorUid}')" class="btn-delete">🗑️</button>` : ''}
                </div>
                <p>@${autorNombre}</p>
                <div class="social-actions">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComs('${id}')">💬</button>
                    <button onclick="seguirUsuario('${autorUid}')" class="btn-follow">Seguir</button>
                </div>
                <div id="box-${id}" class="comments-box" style="display:none;">
                    <div class="comments-list">${comsHtml || "Sin comentarios"}</div>
                    <div class="com-input-group">
                        <input type="text" id="input-${id}" placeholder="Comentar...">
                        <button onclick="enviarComentario('${id}')">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// 4. LÓGICA DE NAVEGACIÓN Y AUTH
document.getElementById('btnHome').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';
document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : (document.getElementById('modalAuth').style.display = 'flex');

document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value, p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => createUserWithEmailAndPassword(auth, e, p));
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0], titleInput = document.getElementById('postTitle');
    if(!file || !titleInput.value) return alert("Falta imagen o título");
    
    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);
    
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if(data.secure_url) {
            await push(ref(db, 'posts'), {
                url: data.secure_url, title: titleInput.value, userId: userActual.uid, userEmail: userActual.email, likes: 0, timestamp: serverTimestamp()
            });
            document.getElementById('modalUpload').style.display = 'none';
            titleInput.value = "";
        }
    } catch (e) { alert("Error al subir"); }
    btn.innerText = "Publicar Ahora";
};

onAuthStateChanged(auth, u => {
    userActual = u;
    document.getElementById('btnOpenUpload').style.display = u ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = u ? 'Salir' : 'Entrar';
});
