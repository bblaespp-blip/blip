import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, update, set, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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
let isProfileView = false;

// --- FUNCIONES DE PERFIL ---
window.verPerfil = (uid, nombre) => {
    isProfileView = true;
    document.getElementById('profile-header').style.display = 'block';
    document.getElementById('profile-name').innerText = `@${nombre}`;
    
    // Cargar Datos del Usuario (Bio y Seguidores)
    onValue(ref(db, `users/${uid}`), snap => {
        const d = snap.val();
        document.getElementById('profile-bio').innerText = d?.bio || "Artista de BLIP.";
        document.getElementById('profile-followers').innerHTML = `<b>${d?.seguidores || 0}</b> Seguidores`;
    });

    // Botón Seguir
    document.getElementById('btnFollow').onclick = async () => {
        if (!userActual) return alert("Inicia sesión para seguir");
        if (userActual.uid === uid) return alert("Es tu perfil");
        await update(ref(db, `users/${uid}`), { seguidores: increment(1) });
        alert("¡Siguiendo!");
    };

    cargarPosts(uid);
};

window.cerrarPerfil = () => {
    isProfileView = false;
    document.getElementById('profile-header').style.display = 'none';
    cargarPosts();
};

// --- CARGAR POSTS (INICIO O PERFIL) ---
function cargarPosts(filtroUid = null) {
    onValue(ref(db, 'posts'), snap => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";
        let count = 0;
        
        if (!snap.exists()) return;

        snap.forEach(p => {
            const d = p.val();
            if (filtroUid && d.userId !== filtroUid) return;
            
            count++;
            const autor = d.userEmail ? d.userEmail.split('@')[0] : "artista";
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${d.url}">
                <div class="info">
                    <h3>${d.title}</h3>
                    <p onclick="verPerfil('${d.userId}', '${autor}')" style="color:#7b5cff; cursor:pointer;">@${autor}</p>
                </div>`;
            feed.prepend(card);
        });
        if (filtroUid) document.getElementById('profile-stats').innerHTML = `<b>${count}</b> Publicaciones`;
    });
}

// --- SESIÓN Y REGISTRO ---
onAuthStateChanged(auth, u => {
    userActual = u;
    document.getElementById('btnOpenUpload').style.display = u ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = u ? 'Salir' : 'Entrar';
});

document.getElementById('btnDoAuth').onclick = async () => {
    const e = document.getElementById('email').value, p = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch {
        const cred = await createUserWithEmailAndPassword(auth, e, p);
        await set(ref(db, `users/${cred.user.uid}`), { username: e.split('@')[0], bio: "¡Hola!", seguidores: 0 });
    }
    document.getElementById('modalAuth').style.display = 'none';
};

// --- SUBIDA DE ARTE ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0], title = document.getElementById('postTitle').value;
    if (!file || !userActual) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'blip_unsigned');

    const res = await fetch(`https://api.api.cloudinary.com/v1_1/dz9s37bk0/image/upload`, { method: "POST", body: formData });
    const data = await res.json();

    if (data.secure_url) {
        await push(ref(db, 'posts'), {
            url: data.secure_url, title: title, userId: userActual.uid, userEmail: userActual.email, timestamp: serverTimestamp()
        });
        document.getElementById('modalUpload').style.display = 'none';
    }
};

// --- EVENTOS BOTONES ---
document.getElementById('btnHome').onclick = () => cerrarPerfil();
document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : document.getElementById('modalAuth').style.display='flex';
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display='flex';

cargarPosts();
