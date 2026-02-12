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

// --- FUNCIONES INCORPORADAS (EXPORTADAS A WINDOW PARA EL HTML) ---

window.darLike = async (postId, currentLikes) => {
    if (!userActual) return alert("Inicia sesión para dar like");
    const postRef = ref(db, `posts/${postId}`);
    await update(postRef, { likes: (currentLikes || 0) + 1 });
};

window.enviarComentario = async (postId) => {
    if (!userActual) return alert("Inicia sesión para comentar");
    const input = document.getElementById(`input-${postId}`);
    const texto = input.value;
    
    if (!texto.trim()) return;
    const comentariosRef = ref(db, `posts/${postId}/comentarios`);
    await push(comentariosRef, {
        usuario: userActual.email.split('@')[0],
        texto: texto,
        timestamp: Date.now()
    });
    input.value = "";
};

window.seguirUsuario = async (uidSeguido) => {
    if (!userActual) return alert("Inicia sesión para seguir artistas");
    if (userActual.uid === uidSeguido) return alert("No puedes seguirte a ti mismo");
    
    const seguimientoRef = ref(db, `users/${userActual.uid}/siguiendo/${uidSeguido}`);
    await update(seguimientoRef, { activo: true });
    alert("¡Ahora sigues a este artista!");
};

window.toggleComs = (id) => {
    const el = document.getElementById(`box-${id}`);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// --- RENDERIZADO DEL FEED ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    
    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const autorNombre = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        const autorUid = d.userId || ""; // Asegúrate de guardar el userId al subir

        let comsHtml = "";
        if(d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                comsHtml += `<div><b>${c.usuario}:</b> ${c.texto}</div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p>@${autorNombre}</p>
                <div class="social-actions">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComs('${id}')">💬</button>
                    <button onclick="seguirUsuario('${autorUid}')" class="btn-follow">Seguir</button>
                </div>
                <div id="box-${id}" class="comments-box" style="display:none;">
                    <div class="comments-list">${comsHtml || "Aún no hay comentarios..."}</div>
                    <div class="com-input-group">
                        <input type="text" id="input-${id}" placeholder="Escribe un comentario...">
                        <button onclick="enviarComentario('${id}')">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// --- SUBIDA DE IMAGEN (ACTUALIZADA CON USERID) ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    if(!file || !title || !userActual) return alert("Completa los datos");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();

    if(data.secure_url) {
        await push(ref(db, 'posts'), {
            url: data.secure_url,
            title: title,
            userId: userActual.uid, // Importante para la función de seguir
            userEmail: userActual.email,
            likes: 0,
            timestamp: serverTimestamp()
        });
        document.getElementById('modalUpload').style.display = 'none';
    }
};

// --- AUTH ---
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
