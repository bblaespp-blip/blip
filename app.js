import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, get, remove, update } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA5yh8J7Mgij3iZCOEZ2N8r1yhDkLcXsTg",
    authDomain: "almacenamiento-redsocial.firebaseapp.com",
    databaseURL: "https://almacenamiento-redsocial-default-rtdb.firebaseio.com",
    projectId: "almacenamiento-redsocial",
    storageBucket: "almacenamiento-redsocial.appspot.com",
    messagingSenderId: "562861595597",
    appId: "1:562861595597:web:a88c0af7d0c8da44a9c284"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let userActual = null;

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUD_NAME = "dbu9v8v7e";
const UPLOAD_PRESET = "ml_default"; 

// --- NAVEGACIÓN ---
function mostrarSeccion(id) {
    ['feed', 'followingFeed', 'profile'].forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = (s === id) ? 'grid' : 'none';
    });
}

document.getElementById('btnHome').onclick = () => mostrarSeccion('feed');
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';
document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : document.getElementById('modalAuth').style.display = 'flex';

// --- FUNCIÓN DE SUBIDA ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    const btn = document.getElementById('btnDoUpload');

    if (!file || !title) return alert("Selecciona una imagen y escribe un título");
    if (!userActual) return alert("Debes iniciar sesión");

    btn.innerText = "Subiendo...";
    btn.disabled = true;

    try {
        // 1. Enviar a Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.secure_url) {
            // 2. Guardar enlace en Firebase
            await push(ref(db, 'posts'), {
                url: data.secure_url,
                title: title,
                userId: userActual.uid,
                userEmail: userActual.email,
                likes: 0,
                timestamp: Date.now()
            });

            alert("¡Arte publicado!");
            document.getElementById('modalUpload').style.display = 'none';
            document.getElementById('postTitle').value = "";
        } else {
            alert("Error de Cloudinary: " + (data.error ? data.error.message : "No se pudo subir"));
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    } finally {
        btn.innerText = "Publicar Ahora";
        btn.disabled = false;
    }
};

// --- MOSTRAR POSTS ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(p => {
        const post = p.val();
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${post.url}">
            <div class="info">
                <h3>${post.title}</h3>
                <p>@${post.userEmail.split('@')[0]}</p>
            </div>
        `;
        feed.prepend(card);
    });
});

onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

// Login simple
document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p)
        .then(() => document.getElementById('modalAuth').style.display = 'none')
        .catch(() => createUserWithEmailAndPassword(auth, e, p));
};
