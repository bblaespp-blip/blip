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

// --- SUBIDA A CLOUDINARY ---
const publicarArte = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;

    if (!file || !title) return alert("Falta imagen o título");

    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); // REVISAR ESTO EN CLOUDINARY

    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dbu9v8v7e/image/upload", {
            method: "POST",
            body: formData
        });
        
        const data = await res.json();

        if (data.secure_url) {
            await push(ref(db, 'posts'), {
                url: data.secure_url,
                title: title,
                userId: userActual.uid,
                userEmail: userActual.email
            });
            alert("¡Éxito!");
            document.getElementById('modalUpload').style.display = 'none';
        } else {
            alert("Error Cloudinary: " + data.error.message);
        }
    } catch (e) {
        alert("Error de conexión: " + e.message);
    } finally {
        btn.innerText = "Publicar Ahora";
        btn.disabled = false;
    }
};

document.getElementById('btnDoUpload').onclick = publicarArte;

// --- MOSTRAR POSTS ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snap.forEach(p => {
        const d = p.val();
        feed.innerHTML += `
            <div class="card">
                <img src="${d.url}">
                <div class="info"><h3>${d.title}</h3></div>
            </div>`;
    });
});

// --- AUTH ---
onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => createUserWithEmailAndPassword(auth, e, p));
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : document.getElementById('modalAuth').style.display = 'flex';
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';
