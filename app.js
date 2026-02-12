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

// --- FUNCIONES GLOBALES ---
window.darLike = async (postId, currentLikes) => {
    if (!userActual) return alert("Inicia sesión primero");
    await update(ref(db, `posts/${postId}`), { likes: (currentLikes || 0) + 1 });
};

window.toggleComentarios = (postId) => {
    const box = document.getElementById(`box-${postId}`);
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
};

window.enviarComentario = async (postId) => {
    if (!userActual) return alert("Inicia sesión para comentar");
    const input = document.getElementById(`input-${postId}`);
    if (!input || !input.value.trim()) return;

    const data = {
        usuario: userActual.email.split('@')[0],
        texto: input.value,
        timestamp: Date.now()
    };

    await push(ref(db, `posts/${postId}/comentarios`), data);
    input.value = ""; // Limpiar tras enviar
};

// --- RENDERIZADO EN TIEMPO REAL ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    
    snap.forEach(postSnap => {
        const d = postSnap.val();
        const id = postSnap.key;
        const autor = d.userEmail ? d.userEmail.split('@')[0] : "artista";

        // Generar la lista de comentarios para este post
        let listaComentariosHTML = "";
        if (d.comentarios) {
            // Convertimos el objeto de FB en array y lo ordenamos por fecha
            const lista = Object.values(d.comentarios);
            lista.forEach(c => {
                listaComentariosHTML += `
                    <div class="comentario-item" style="padding: 5px 0; border-bottom: 1px solid #333; text-align: left; font-size: 0.85rem;">
                        <b style="color: #7b5cff;">@${c.usuario}:</b> 
                        <span style="color: #fff;">${c.texto}</span>
                    </div>`;
            });
        } else {
            listaComentariosHTML = `<p style="color: #666; font-size: 0.75rem;">Sé el primero en comentar...</p>`;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p class="tag">@${autor}</p>
                <div class="social-bar">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComentarios('${id}')">💬</button>
                </div>
                <div id="box-${id}" class="comment-box" style="display:none; background: #111; padding: 10px; border-radius: 8px; margin-top: 10px;">
                    <div id="list-${id}" class="comment-list" style="max-height: 120px; overflow-y: auto; margin-bottom: 10px;">
                        ${listaComentariosHTML}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <input type="text" id="input-${id}" placeholder="Escribe..." style="flex: 1; padding: 5px; border-radius: 4px; border: 1px solid #333; background: #222; color: #fff;">
                        <button onclick="enviarComentario('${id}')" style="background: #7b5cff; border: none; color: white; border-radius: 4px; padding: 5px 10px;">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// --- AUTH & UPLOAD ---
onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    if(!file || !title) return alert("Completa los campos");
    
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
