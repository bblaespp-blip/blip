import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

// --- 1. BUSCADOR DE PERFILES (LÓGICA) ---
document.getElementById('userSearch').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const username = card.getAttribute('data-user').toLowerCase();
        card.style.display = username.includes(term) ? 'block' : 'none';
    });
};

// --- 2. FUNCIÓN PARA ENVIAR COMENTARIOS ---
window.enviarComentario = async (postId, texto, input) => {
    if (!userActual) return alert("Inicia sesión para comentar");
    if (!texto.trim()) return;

    try {
        await push(ref(db, `posts/${postId}/comments`), {
            user: userActual.email.split('@')[0],
            text: texto,
            timestamp: Date.now()
        });
        input.value = ""; 
    } catch (e) {
        console.error("Error al comentar:", e);
    }
};

// --- 3. CARGAR FEED CON COMENTARIOS ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    
    snap.forEach(p => {
        const postId = p.key;
        const d = p.val();
        const autor = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-user', autor); // Atributo para el buscador
        
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p onclick="verPerfil('${d.userId}', '${autor}')" style="color:#7b5cff; cursor:pointer;">@${autor}</p>
            </div>
            <div class="comments-section" style="padding:10px; border-top:1px solid #222; background:#0a0a0a;">
                <div id="list-${postId}" style="max-height:60px; overflow-y:auto; font-size:0.8rem; margin-bottom:8px; color:#aaa;">
                    </div>
                <input type="text" placeholder="Añadir comentario..." 
                    style="margin:0; padding:5px; font-size:0.8rem;"
                    onkeydown="if(event.key==='Enter') enviarComentario('${postId}', this.value, this)">
            </div>`;
        
        // Listener en tiempo real para los comentarios de ESTA card
        onValue(ref(db, `posts/${postId}/comments`), cSnap => {
            const list = document.getElementById(`list-${postId}`);
            if (list) {
                list.innerHTML = "";
                cSnap.forEach(c => {
                    const com = c.val();
                    list.innerHTML += `<div><b style="color:#7b5cff">${com.user}:</b> ${com.text}</div>`;
                });
                list.scrollTop = list.scrollHeight;
            }
        });

        feed.prepend(card);
    });
});

// --- 4. SUBIDA DE OBRAS ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const titleInput = document.getElementById('postTitle');
    const btn = document.getElementById('btnDoUpload');

    if(!file || !titleInput.value || !userActual) return alert("Faltan datos o sesión");

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
                timestamp: serverTimestamp()
            });
            document.getElementById('modalUpload').style.display = 'none';
            titleInput.value = "";
        }
    } catch (e) {
        alert("Error al subir");
    } finally {
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
};

// --- 5. MANEJO DE SESIÓN Y BOTÓN PERFIL ---
onAuthStateChanged(auth, user => {
    userActual = user;
    const btnLogin = document.getElementById('btnLogin');
    const btnUpload = document.getElementById('btnOpenUpload');

    btnUpload.style.display = user ? 'block' : 'none';

    if (user) {
        btnLogin.innerText = `@${user.email.split('@')[0]}`;
        // Al hacer clic en su nombre, abre su propio perfil
        btnLogin.onclick = () => verPerfil(user.uid, user.email.split('@')[0]);
        
        // Creamos un botón de "Salir" pequeño si no existe
        if(!document.getElementById('btnLogout')) {
            const logout = document.createElement('button');
            logout.id = 'btnLogout';
            logout.innerText = 'Cerrar Sesión';
            logout.style.background = '#333';
            logout.onclick = () => signOut(auth);
            document.querySelector('.nav-buttons').appendChild(logout);
        }
    } else {
        btnLogin.innerText = 'Entrar';
        btnLogin.onclick = () => document.getElementById('modalAuth').style.display = 'flex';
        const logout = document.getElementById('btnLogout');
        if(logout) logout.remove();
    }
});

document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => createUserWithEmailAndPassword(auth, e, p));
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnHome').onclick = () => location.reload();
