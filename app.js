import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, update, remove, serverTimestamp, set } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// 1. CONFIGURACIÓN
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

// --- FUNCIONES GLOBALES (ACCESIBLES DESDE EL HTML) ---

window.darLike = async (postId, currentLikes) => {
    if (!userActual) return alert("Inicia sesión para interactuar");
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
    alert("¡Siguiendo a este artista!");
};

window.borrarPost = async (postId, autorUid) => {
    if (userActual && userActual.uid === autorUid) {
        if (confirm("¿Seguro que quieres borrar tu obra?")) await remove(ref(db, `posts/${postId}`));
    }
};

window.toggleComs = (id) => {
    const el = document.getElementById(`box-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// --- CHAT GLOBAL ---
const globalChatDiv = document.createElement('div');
globalChatDiv.id = 'globalChat';
globalChatDiv.style.cssText = 'position:fixed;bottom:80px;right:20px;width:300px;height:350px;background:#141414;border:1px solid #333;border-radius:10px;padding:15px;display:none;flex-direction:column;z-index:4000;box-shadow: 0 10px 30px rgba(0,0,0,0.5);';
globalChatDiv.innerHTML = `
    <h4 style="margin:0 0 10px 0; color:#7b5cff;">Chat Global</h4>
    <div id="globalMsgs" style="flex:1; overflow-y:auto; font-size:13px; margin-bottom:10px; color:#ccc;"></div>
    <input id="globalInput" placeholder="Escribe un mensaje..." style="width:100%; background:#222; border:1px solid #333; color:white; padding:8px; border-radius:5px;">
`;
document.body.appendChild(globalChatDiv);

window.toggleGlobalChat = () => {
    if (!userActual) return alert("Inicia sesión para chatear");
    globalChatDiv.style.display = globalChatDiv.style.display === 'none' ? 'flex' : 'none';
};

document.addEventListener('keypress', (e) => {
    const input = document.getElementById('globalInput');
    if(e.key === 'Enter' && document.activeElement === input && auth.currentUser) {
        const msgRef = push(ref(db, 'globalChat'));
        set(msgRef, {
            from: auth.currentUser.email.split('@')[0],
            text: input.value,
            date: Date.now()
        });
        input.value = '';
    }
});

onValue(ref(db, 'globalChat'), snap => {
    const box = document.getElementById('globalMsgs');
    box.innerHTML = '';
    snap.forEach(s => {
        const m = s.val();
        box.innerHTML += `<p style="margin:5px 0"><b style="color:#7b5cff;">${m.from}:</b> ${m.text}</p>`;
    });
    box.scrollTop = box.scrollHeight;
});

// --- RENDERIZADO DEL FEED ---
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
                comsHtml += `<div style="padding:4px 0; border-bottom:1px solid #222;"><b style="color:#7b5cff;">${c.usuario}:</b> ${c.texto}</div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>${d.title}</h3>
                    ${esMio ? `<button onclick="borrarPost('${id}', '${autorUid}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">🗑️</button>` : ''}
                </div>
                <p>@${autorNombre}</p>
                <div class="social-actions">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComs('${id}')">💬</button>
                    <button onclick="seguirUsuario('${autorUid}')" style="margin-left:auto; border-color:#7b5cff; color:#7b5cff;">Seguir</button>
                </div>
                <div id="box-${id}" class="comments-box" style="display:none; text-align:left; background:#0d0d0d; padding:10px; border-radius:8px; margin-top:10px;">
                    <div class="comments-list" style="max-height:100px; overflow-y:auto; font-size:0.8rem;">${comsHtml || "Sin comentarios"}</div>
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <input type="text" id="input-${id}" placeholder="Comentar..." style="flex:1; padding:5px; background:#1a1a1a; border:1px solid #333; color:white; border-radius:4px; margin:0;">
                        <button onclick="enviarComentario('${id}')" style="background:#7b5cff; border:none; color:white; padding:0 10px; border-radius:4px; cursor:pointer;">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// --- LÓGICA DE BOTONES ---
document.getElementById('btnHome').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

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
    btn.innerText = "Publicar";
};
