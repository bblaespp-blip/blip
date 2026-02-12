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

// --- FUNCIONES DE VENTANA ---
window.darLike = (id, likes) => {
    if (!userActual) return alert("Inicia sesión para dar like");
    update(ref(db, `posts/${id}`), { likes: (likes || 0) + 1 });
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
        fecha: Date.now()
    });
    input.value = "";
};

// --- RENDER FEED ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const autor = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        
        let htmlComs = "";
        if(d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                htmlComs += `<div class="comentario"><b>${c.usuario}:</b> ${c.texto}</div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p class="autor-tag">@${autor}</p>
                <div class="botones">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComentarios('${id}')">💬</button>
                </div>
                <div id="box-${id}" class="caja-comentarios" style="display:none;">
                    <div class="lista-coms">${htmlComs}</div>
                    <div class="input-area">
                        <input type="text" id="input-${id}" placeholder="Comentar...">
                        <button onclick="enviarComentario('${id}')">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// --- SESIÓN Y SUBIDA ---
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

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    if(!file || !title) return alert("Falta imagen o título");
    
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
