import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "388153554154555",
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

// --- CONFIG CLOUDINARY ---
const CLOUD_NAME = "dbu9v8v7e"; 
const PRESET = "ml_default"; // <--- VERIFICA ESTE NOMBRE EN TU CLOUDINARY

// --- SUBIDA ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    const btn = document.getElementById('btnDoUpload');

    if(!file || !title) return alert("Falta imagen o título");

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
                userEmail: userActual.email
            });
            alert("¡Publicado!");
            document.getElementById('modalUpload').style.display = 'none';
        } else {
            alert("Error Cloudinary: " + (data.error ? data.error.message : "Desconocido"));
        }
    } catch (e) {
        alert("Error de conexión");
    } finally {
        btn.innerText = "Publicar Ahora";
        btn.disabled = false;
    }
};

// --- FEED ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(p => {
        const d = p.val();
        feed.innerHTML += `<div class="card"><img src="${d.url}"><div class="info"><h3>${d.title}</h3></div></div>`;
    });
});

// --- AUTH ---
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

