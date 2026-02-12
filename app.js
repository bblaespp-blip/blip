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
let modoLogin = true;

// --- NAVEGACIÓN SEGURA ---
const secciones = ['feed', 'followingFeed', 'profile'];
const mostrarSeccion = (id) => {
    secciones.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = (s === id) ? 'grid' : 'none';
    });
};

const setupBtn = (id, func) => {
    const el = document.getElementById(id);
    if(el) el.onclick = func;
};

setupBtn('btnHome', () => mostrarSeccion('feed'));
setupBtn('btnFollows', () => userActual ? mostrarSeccion('followingFeed') : document.getElementById('modalAuth').style.display='flex');
setupBtn('btnProfile', () => userActual ? mostrarSeccion('profile') : document.getElementById('modalAuth').style.display='flex');
setupBtn('btnOpenUpload', () => document.getElementById('modalUpload').style.display = 'flex');
setupBtn('btnLogin', () => userActual ? signOut(auth) : document.getElementById('modalAuth').style.display = 'flex');

// --- SUBIR ARTE (Cloudinary) ---
setupBtn('btnDoUpload', async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    const btn = document.getElementById('btnDoUpload');

    if(!file || !title) return alert("Completa los campos");
    
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default');

        const res = await fetch("https://api.cloudinary.com/v1_1/dbu9v8v7e/image/upload", {
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
                likes: 0
            });
            alert("¡Publicado!");
            document.getElementById('modalUpload').style.display = 'none';
        }
    } catch (e) {
        alert("Error al subir");
    } finally {
        btn.innerText = "Publicar Ahora";
        btn.disabled = false;
    }
});

// --- RENDERIZADO ---
function crearCarta(id, datos) {
    const box = document.createElement('div');
    box.className = 'card';
    box.innerHTML = `
        <img src="${datos.url}">
        <div class="info">
            <h3>${datos.title}</h3>
            <p style="color:#7b5cff;">@${datos.userEmail.split('@')[0]}</p>
        </div>
    `;
    return box;
}

onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if(feed) {
        feed.innerHTML = "";
        snap.forEach(p => feed.prepend(crearCarta(p.key, p.val())));
    }
});

onAuthStateChanged(auth, user => {
    userActual = user;
    const up = document.getElementById('btnOpenUpload');
    if(up) up.style.display = user ? 'block' : 'none';
    const log = document.getElementById('btnLogin');
    if(log) log.innerText = user ? 'Salir' : 'Entrar';
});

setupBtn('btnDoAuth', () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    const f = modoLogin ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    f(auth, e, p).then(() => document.getElementById('modalAuth').style.display='none').catch(err => alert("Error"));
});

setupBtn('btnToggleAuth', () => {
    modoLogin = !modoLogin;
    document.getElementById('authTitle').innerText = modoLogin ? 'Entrar' : 'Registrarse';
});
