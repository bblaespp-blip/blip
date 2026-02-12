import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, serverTimestamp, set } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// Configuración de Firebase (Se mantiene igual)
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
// Buscamos el elemento con ID 'userSearch' que añadimos en el index.html
const searchInput = document.getElementById('userSearch');
if (searchInput) {
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            const username = card.querySelector('.info p').innerText.toLowerCase();
            // Si el nombre del artista incluye lo que escribimos, se queda; si no, se oculta.
            card.style.display = username.includes(term) ? 'block' : 'none';
        });
    };
}

// --- 2. FUNCIÓN GLOBAL PARA COMENTARIOS ---
window.enviarComentario = async (postId, texto, input) => {
    if (!userActual) return alert("Inicia sesión para comentar");
    if (!texto.trim()) return;

    const nombreUsuario = userActual.email.split('@')[0];
    
    try {
        await push(ref(db, `posts/${postId}/comments`), {
            usuario: nombreUsuario,
            texto: texto,
            timestamp: serverTimestamp()
        });
        input.value = ""; // Limpia el input tras enviar
    } catch (e) {
        console.error("Error al comentar:", e);
    }
};

// --- 3. CARGAR FEED + RENDERIZAR COMENTARIOS ---
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
                <p onclick="verPerfil('${d.userId}', '${autor}')" style="color:#7b5cff; cursor:pointer; font-weight:bold;">@${autor}</p>
            </div>
            <div class="comments-area" style="padding:12px; border-top:1px solid #222; background:#0a0a0a;">
                <div id="comments-list-${postId}" class="comments-display" style="max-height:80px; overflow-y:auto; font-size:0.8rem; margin-bottom:8px; color:#ddd;">
                    </div>
                <input type="text" class="comment-input" placeholder="Comentar..." 
                    style="width:100%; background:#1a1a1a; border:1px solid #333; color:white; padding:6px; border-radius:5px; font-size:0.8rem;"
                    onkeydown="if(event.key==='Enter') enviarComentario('${postId}', this.value, this)">
            </div>`;
        
        // Listener para los comentarios de este post en tiempo real
        onValue(ref(db, `posts/${postId}/comments`), commSnap => {
            const listDiv = document.getElementById(`comments-list-${postId}`);
            if (listDiv) {
                listDiv.innerHTML = "";
                commSnap.forEach(c => {
                    const cData = c.val();
                    listDiv.innerHTML += `<div style="margin-bottom:4px;"><b style="color:#7b5cff;">${cData.usuario}:</b> ${cData.texto}</div>`;
                });
                listDiv.scrollTop = listDiv.scrollHeight;
            }
        });

        feed.prepend(card);
    });
});

// --- 4. SUBIDA A CLOUDINARY ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    const btn = document.getElementById('btnDoUpload');

    if(!file || !title || !userActual) return alert("Completa los datos");

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
        alert("Error de subida");
    } finally {
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
};

// --- 5. PERFIL DE USUARIO Y SESIÓN (Rojo en tu dibujo) ---
onAuthStateChanged(auth, user => {
    userActual = user;
    const btnLogin = document.getElementById('btnLogin');
    const btnUpload = document.getElementById('btnOpenUpload');

    btnUpload.style.display = user ? 'block' : 'none';

    if (user) {
        const username = user.email.split('@')[0];
        // Aquí aplicamos lo que querías: el botón de "Entrar" ahora muestra el perfil
        btnLogin.innerText = `@${username}`; 
        btnLogin.style.background = "#333";
        btnLogin.onclick = () => verPerfil(user.uid, username);
        
        // Si queremos cerrar sesión, podríamos añadir un doble clic o un botón extra
        btnLogin.title = "Doble clic para salir";
        btnLogin.ondblclick = () => signOut(auth);
    } else {
        btnLogin.innerText = 'Entrar';
        btnLogin.style.background = "";
        btnLogin.onclick = () => document.getElementById('modalAuth').style.display = 'flex';
    }
});

// Autenticación (Mismo sistema)
document.getElementById('btnDoAuth').onclick = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch (err) {
        const cred = await createUserWithEmailAndPassword(auth, e, p);
        await set(ref(db, `users/${cred.user.uid}`), { 
            username: e.split('@')[0], bio: "Nuevo artista", seguidores: 0 
        });
    }
    document.getElementById('modalAuth').style.display = 'none';
};

// Navegación
document.getElementById('btnHome').onclick = () => location.reload();
