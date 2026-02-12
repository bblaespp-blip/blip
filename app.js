import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

// --- DATOS DE TU CLOUDINARY (SACADOS DE TU CAPTURA) ---
const CLOUD_NAME = "dz9s37bk0"; 
const PRESET = "blip_unsigned"; // Usamos el que creaste hoy

// --- FUNCIÓN DE PUBLICACIÓN ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const titleInput = document.getElementById('postTitle');
    const title = titleInput.value;
    const btn = document.getElementById('btnDoUpload');

    if(!file || !title) return alert("Selecciona una imagen y ponle título");

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
                userEmail: userActual ? userActual.email : "Anónimo",
                timestamp: Date.now()
            });
            alert("¡Publicado con éxito!");
            document.getElementById('modalUpload').style.display = 'none';
            titleInput.value = "";
        } else {
            alert("Error: " + (data.error ? data.error.message : "Error en Cloudinary"));
        }
    } catch (e) {
        alert("Error de red: " + e.message);
    } finally {
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
};

// --- CARGAR EL FEED ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(p => {
        const d = p.val();
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p>@${d.userEmail ? d.userEmail.split('@')[0] : 'artista'}</p>
            </div>`;
        feed.prepend(card);
    });
});

// --- MANEJO DE SESIÓN ---
onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : document.getElementById('modalAuth').style.display = 'flex';
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';
document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => createUserWithEmailAndPassword(auth, e, p));
    document.getElementById('modalAuth').style.display = 'none';
};
