import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, get, remove, update } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// Configuración de Firebase (Verificada)
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

// --- DATOS DE CLOUDINARY (Extraídos de tu captura) ---
const CLOUD_NAME = "dbu9v8v7e";
const UPLOAD_PRESET = "ml_default"; 

// --- NAVEGACIÓN Y MODALES ---
const manejarModal = (id, accion) => {
    const el = document.getElementById(id);
    if(el) el.style.display = (accion === 'abrir') ? 'flex' : 'none';
};

// Botones principales
document.getElementById('btnHome').onclick = () => location.reload();
document.getElementById('btnOpenUpload').onclick = () => manejarModal('modalUpload', 'abrir');
document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : manejarModal('modalAuth', 'abrir');

// --- LÓGICA DE PUBLICACIÓN ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    const btn = document.getElementById('btnDoUpload');

    if(!file || !title) return alert("Debes subir una imagen y ponerle título");
    if(!userActual) return alert("Inicia sesión para publicar");

    btn.innerText = "Subiendo...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        // Petición a Cloudinary
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();

        if(data.secure_url) {
            // Guardar en Firebase Database
            await push(ref(db, 'posts'), {
                url: data.secure_url,
                title: title,
                userId: userActual.uid,
                userEmail: userActual.email,
                likes: 0,
                timestamp: Date.now()
            });
            alert("¡Arte publicado!");
            manejarModal('modalUpload', 'cerrar');
            document.getElementById('postTitle').value = "";
        } else {
            alert("Error: " + (data.error ? data.error.message : "No se pudo subir"));
        }
    } catch (e) {
        alert("Error de conexión: " + e.message);
    } finally {
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
};

// --- CARGAR EL FEED ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if(!feed) return;
    feed.innerHTML = "";
    snap.forEach(item => {
        const post = item.val();
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${post.url}" loading="lazy">
            <div class="info">
                <h3>${post.title}</h3>
                <p style="color:#7b5cff; font-size:0.9rem;">@${post.userEmail.split('@')[0]}</p>
            </div>
        `;
        feed.prepend(card);
    });
});

// --- AUTENTICACIÓN ---
onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

document.getElementById('btnDoAuth').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    
    // Intenta entrar, si no existe, crea la cuenta (Registro/Login automático)
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => manejarModal('modalAuth', 'cerrar'))
        .catch(() => {
            createUserWithEmailAndPassword(auth, email, pass)
                .then(() => manejarModal('modalAuth', 'cerrar'))
                .catch(err => alert("Error: " + err.message));
        });
};
