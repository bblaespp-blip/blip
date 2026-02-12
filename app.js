import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
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

// BUSCADOR
document.getElementById('userSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
        const username = card.querySelector('.info p').innerText.toLowerCase();
        card.style.display = username.includes(term) ? 'block' : 'none';
    });
});

// COMENTARIOS
window.enviarComentario = async (postId, texto, input) => {
    if (!userActual || !texto.trim()) return;
    await push(ref(db, `posts/${postId}/comments`), {
        usuario: userActual.email.split('@')[0],
        texto: texto,
        timestamp: serverTimestamp()
    });
    input.value = ""; 
};

// FEED
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
                <p>@${autor}</p>
            </div>
            <div class="comments-area">
                <div id="list-${postId}" class="comments-display"></div>
                <input type="text" placeholder="Añadir comentario..." onkeydown="if(event.key==='Enter') enviarComentario('${postId}', this.value, this)">
            </div>`;
        
        onValue(ref(db, `posts/${postId}/comments`), cSnap => {
            const list = document.getElementById(`list-${postId}`);
            if (list) {
                list.innerHTML = "";
                cSnap.forEach(c => {
                    const com = c.val();
                    list.innerHTML += `<div><b style="color:#7b5cff">${com.usuario}:</b> ${com.texto}</div>`;
                });
                list.scrollTop = list.scrollHeight;
            }
        });
        feed.prepend(card);
    });
});

// SUBIDA
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    if(!file || !title || !userActual) return alert("Faltan datos");

    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo..."; btn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();

    if(data.secure_url) {
        await push(ref(db, 'posts'), {
            url: data.secure_url, title: title, userId: userActual.uid, userEmail: userActual.email, timestamp: serverTimestamp()
        });
        document.getElementById('modalUpload').style.display = 'none';
    }
    btn.innerText = "Publicar"; btn.disabled = false;
};

// SESIÓN
onAuthStateChanged(auth, user => {
    userActual = user;
    const btnL = document.getElementById('btnLogin');
    const btnU = document.getElementById('btnOpenUpload');
    if (user) {
        btnU.style.display = 'block';
        btnL.innerText = `@${user.email.split('@')[0]}`;
    } else {
        btnU.style.display = 'none';
        btnL.innerText = 'Entrar';
    }
});

document.getElementById('btnDoAuth').onclick = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch {
        await createUserWithEmailAndPassword(auth, e, p);
    }
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnHome').onclick = () => location.reload();
document.getElementById('btnLogin').onclick = () => { if(!userActual) document.getElementById('modalAuth').style.display = 'flex'; };
