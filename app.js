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

// --- CONFIG CLOUDINARY ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dbu9v8v7e/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

// --- NAVEGACIÓN ---
const mostrarSeccion = (id) => {
    ['feed', 'followingFeed', 'profile'].forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = (s === id) ? 'grid' : 'none';
    });
};

document.getElementById('btnHome').onclick = () => mostrarSeccion('feed');
document.getElementById('btnFollows').onclick = () => userActual ? mostrarSeccion('followingFeed') : alert("Inicia sesión");
document.getElementById('btnProfile').onclick = () => userActual ? mostrarSeccion('profile') : alert("Inicia sesión");
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';
document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : (document.getElementById('modalAuth').style.display = 'flex');

// --- LA FUNCIÓN DE PUBLICAR (REVISADA) ---
const btnPublicar = document.getElementById('btnDoUpload');
if (btnPublicar) {
    btnPublicar.onclick = async () => {
        const fileInput = document.getElementById('fileInput');
        const titleInput = document.getElementById('postTitle');
        
        if (!fileInput.files[0] || !titleInput.value.trim()) {
            return alert("Falta imagen o título");
        }

        btnPublicar.innerText = "Subiendo...";
        btnPublicar.disabled = true;

        try {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await res.json();

            if (data.secure_url) {
                await push(ref(db, 'posts'), {
                    url: data.secure_url,
                    title: titleInput.value,
                    userId: userActual.uid,
                    userEmail: userActual.email,
                    likes: 0,
                    timestamp: Date.now()
                });
                alert("¡Publicado!");
                document.getElementById('modalUpload').style.display = 'none';
                titleInput.value = "";
            } else {
                alert("Error de Cloudinary: " + (data.error ? data.error.message : "Desconocido"));
            }
        } catch (err) {
            alert("Error de conexión: " + err.message);
        } finally {
            btnPublicar.innerText = "Publicar";
            btnPublicar.disabled = false;
        }
    };
}

// --- CARGA DE DATOS ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if (feed) {
        feed.innerHTML = "";
        snap.forEach(p => {
            const d = p.val();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<img src="${d.url}"><div class="info"><h3>${d.title}</h3><p>@${d.userEmail.split('@')[0]}</p></div>`;
            feed.prepend(card);
        });
    }
});

onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

// Auth Simple
document.getElementById('btnDoAuth').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).then(() => {
        document.getElementById('modalAuth').style.display = 'none';
    }).catch(() => {
        createUserWithEmailAndPassword(auth, e, p).then(() => {
            document.getElementById('modalAuth').style.display = 'none';
        }).catch(err => alert("Error: " + err.message));
    });
};
