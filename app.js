import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, update, remove, serverTimestamp, set } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// 1. CONFIGURACIÓN (Debe estar aquí primero)
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

// --- RENDERIZADO DEL FEED (CORREGIDO) ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = "";
    
    if (!snap.exists()) {
        feed.innerHTML = "<p style='grid-column:1/-1; text-align:center; padding:50px;'>No hay obras. ¡Sube la primera!</p>";
        return;
    }

  // ... (Toda tu configuración inicial de Firebase igual)

onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    // Si estamos viendo un perfil, no dejamos que el feed global sobrescriba nada
    if (window.isProfileView) return; 

    feed.innerHTML = "";
    if (!snap.exists()) return;

    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const autorNombre = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        const autorUid = d.userId || "";

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p onclick="verPerfil('${autorUid}', '${autorNombre}')" style="color:#7b5cff; cursor:pointer; font-weight:bold;">
                    @${autorNombre}
                </p>
                <div class="social-actions">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComs('${id}')">💬</button>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

        // PROTECCIÓN: Si el post no tiene URL, lo saltamos para que no de error
        if (!d || !d.url) return;

        // PROTECCIÓN: Si no hay email, ponemos "Artista Anónimo"
        const autorNombre = d.userEmail ? d.userEmail.split('@')[0] : "artista_anonimo";
        const autorUid = d.userId || "";
        const esMio = userActual && userActual.uid === autorUid;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}" onerror="this.src='https://via.placeholder.com/300?text=Error+de+Imagen'">
            <div class="info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>${d.title || 'Obra sin título'}</h3>
                    ${esMio ? `<button onclick="borrarPost('${id}', '${autorUid}')" style="background:none; border:none; cursor:pointer;">🗑️</button>` : ''}
                </div>
                <p>@${autorNombre}</p>
                <div class="social-actions" style="display:flex; gap:10px; margin-top:10px;">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComs('${id}')">💬 Comentarios</button>
                </div>
                <div id="box-${id}" style="display:none; margin-top:10px; border-top:1px solid #333; padding-top:10px;">
                    <input type="text" id="input-${id}" placeholder="Escribe un comentario..." style="width:70%; background:#222; color:white; border:1px solid #444; padding:5px; border-radius:4px;">
                    <button onclick="enviarComentario('${id}')" style="background:#7b5cff; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">➤</button>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// --- FUNCIONES GLOBALES ---
window.toggleComs = (id) => {
    const el = document.getElementById(`box-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.darLike = (id, likes) => {
    if(!userActual) return alert("Inicia sesión para dar like");
    update(ref(db, `posts/${id}`), { likes: likes + 1 });
};

window.enviarComentario = (id) => {
    const val = document.getElementById(`input-${id}`).value;
    if(!val || !userActual) return alert("Inicia sesión y escribe algo");
    push(ref(db, `posts/${id}/comentarios`), {
        usuario: userActual.email.split('@')[0],
        texto: val,
        timestamp: Date.now()
    });
    document.getElementById(`input-${id}`).value = "";
};

window.borrarPost = (id, uid) => {
    if(userActual && userActual.uid === uid) {
        if(confirm("¿Borrar?")) remove(ref(db, `posts/${id}`));
    }
};

// --- SESIÓN ---
onAuthStateChanged(auth, u => {
    userActual = u;
    document.getElementById('btnOpenUpload').style.display = u ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = u ? 'Salir' : 'Entrar';
});

document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : (document.getElementById('modalAuth').style.display = 'flex');
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';

document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value, p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => createUserWithEmailAndPassword(auth, e, p));
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0], title = document.getElementById('postTitle').value;
    if(!file || !title) return alert("Faltan datos");
    
    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    
    if(data.secure_url) {
        await push(ref(db, 'posts'), {
            url: data.secure_url, title: title, userId: userActual.uid, userEmail: userActual.email, likes: 0
        });
        document.getElementById('modalUpload').style.display = 'none';
    }
    btn.innerText = "Publicar";
};

