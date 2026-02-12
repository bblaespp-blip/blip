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

// --- FUNCIONES SOCIALES (Vinculadas a Window para que el HTML las vea) ---
window.darLike = async (postId, currentLikes) => {
    if (!userActual) return alert("Inicia sesión para dar like");
    await update(ref(db, `posts/${postId}`), { likes: (currentLikes || 0) + 1 });
};

window.toggleComentarios = (postId) => {
    const box = document.getElementById(`box-${postId}`);
    if(box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
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

    await update(ref(db, `users/${userActual.uid}/siguiendo/${artistaId}`), { 
        nombre: artistaNombre, 
        fecha: Date.now() 
    });
    alert(`¡Ahora sigues a ${artistaNombre}!`);
};

// --- RENDERIZADO DEL FEED ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if(!feed) return;
    feed.innerHTML = "";
    
    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const nombreArtista = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p class="artist-name">@${nombreArtista}</p>
                <div class="social-bar">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComentarios('${id}')">💬 Comentar</button>
                    <button onclick="seguirArtista('${d.userId}', '${nombreArtista}')" class="follow-btn">Seguir</button>
                </div>
                <div id="box-${id}" class="comment-section" style="display:none;">
                    <div id="list-${id}" class="comment-list"></div>
                    <div class="comment-input">
                        <input type="text" id="input-${id}" placeholder="Escribe un comentario...">
                        <button onclick="enviarComentario('${id}')">➤</button>
                    </div>
                </div>
            </div>`;
        
        // Cargar comentarios
        const list = card.querySelector(`#list-${id}`);
        if(d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                list.innerHTML += `<p style="margin:5px 0;"><b>${c.usuario}:</b> ${c.texto}</p>`;
            });
        }
        
        feed.prepend(card);
    });
});

// --- SUBIDA ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const titleInput = document.getElementById('postTitle');
    if(!file || !titleInput.value) return alert("Falta imagen o título");

    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();

        if(data.secure_url) {
            await push(ref(db, 'posts'), {
                url: data.secure_url,
                title: titleInput.value,
                userId: userActual.uid,
                userEmail: userActual.email,
                likes: 0,
                timestamp: serverTimestamp()
            });
            document.getElementById('modalUpload').style.display = 'none';
            titleInput.value = "";
            alert("¡Publicado!");
        }
    } catch (e) { alert("Error de red"); }
    finally { btn.innerText = "Publicar"; btn.disabled = false; }
};

// --- AUTH ---
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
