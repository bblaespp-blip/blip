import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
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

// --- 1. BUSCADOR DE PERFILES ---
// Filtra las cards existentes en el DOM basándose en el nombre de usuario
document.getElementById('userSearch').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const username = card.querySelector('.info p').innerText.toLowerCase();
        card.style.display = username.includes(term) ? 'block' : 'none';
    });
};

// --- 2. FUNCIÓN PARA COMENTARIOS (FIREBASE) ---
window.enviarComentario = async (postId, texto, input) => {
    if (!userActual) return alert("Debes iniciar sesión para comentar");
    if (!texto.trim()) return;

    const nombreUsuario = userActual.email.split('@')[0];
    
    // Guardamos el comentario dentro de una subruta del post
    await push(ref(db, `posts/${postId}/comments`), {
        usuario: nombreUsuario,
        texto: texto,
        timestamp: serverTimestamp()
    });
    
    input.value = ""; // Limpiar el cuadro de texto
};

// --- 3. CARGAR FEED Y RENDERIZAR COMENTARIOS ---
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
                <p onclick="verPerfil('${d.userId}', '${autor}')" style="color:#7b5cff; cursor:pointer;">@${autor}</p>
            </div>
            <div class="comments-area" style="padding:10px; border-top:1px solid #222; background:#0a0a0a;">
                <div id="comments-list-${postId}" style="max-height:80px; overflow-y:auto; font-size:0.85rem; margin-bottom:10px;">
                    </div>
                <input type="text" placeholder="Escribe un comentario..." 
                    style="margin:0; padding:8px; font-size:0.8rem; border-radius:5px;"
                    onkeydown="if(event.key==='Enter') enviarComentario('${postId}', this.value, this)">
            </div>`;
        
        // Listener en tiempo real para los comentarios de este post específico
        onValue(ref(db, `posts/${postId}/comments`), commSnap => {
            const listDiv = document.getElementById(`comments-list-${postId}`);
            if (listDiv) {
                listDiv.innerHTML = "";
                commSnap.forEach(c => {
                    const cData = c.val();
                    listDiv.innerHTML += `<div style="margin-bottom:4px;"><b style="color:#7b5cff;">${cData.usuario}:</b> ${cData.texto}</div>`;
                });
                listDiv.scrollTop = listDiv.scrollHeight; // Auto-scroll al último comentario
            }
        });

        feed.prepend(card);
    });
});

// --- 4. SUBIDA A CLOUDINARY + REGISTRO EN FIREBASE ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    const btn = document.getElementById('btnDoUpload');

    if(!file || !title || !userActual) return alert("Sube una imagen, pon un título e inicia sesión");

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
                title: title,
                userId: userActual.uid,
                userEmail: userActual.email,
                timestamp: serverTimestamp()
            });
            document.getElementById('modalUpload').style.display = 'none';
        }
    } catch (e) {
        alert("Error en la conexión con Cloudinary");
    } finally {
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
};

// --- 5. GESTIÓN DE PERFIL Y SESIÓN ---
onAuthStateChanged(auth, user => {
    userActual = user;
    const btnLogin = document.getElementById('btnLogin');
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';

    if (user) {
        const username = user.email.split('@')[0];
        btnLogin.innerText = `@${username}`; // Cambia "Entrar" por el perfil del usuario (Flecha Roja)
        btnLogin.onclick = () => verPerfil(user.uid, username);
    } else {
        btnLogin.innerText = 'Entrar';
        btnLogin.onclick = () => document.getElementById('modalAuth').style.display = 'flex';
    }
});

document.getElementById('btnDoAuth').onclick = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch (err) {
        const cred = await createUserWithEmailAndPassword(auth, e, p);
        // Crear perfil inicial en Firebase
        await set(ref(db, `users/${cred.user.uid}`), { 
            username: e.split('@')[0], 
            bio: "¡Nuevo artista en BLIP!", 
            seguidores: 0 
        });
    }
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnHome').onclick = () => {
    if (window.isProfileView) {
        cerrarPerfil();
    } else {
        location.reload();
    }
};
