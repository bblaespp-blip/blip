import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, set, update, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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
let vistaPerfil = false;

// --- BUSCADOR ---
document.getElementById('userSearch').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
        const username = card.querySelector('.info p').innerText.toLowerCase();
        card.style.display = username.includes(term) ? 'block' : 'none';
    });
};

// --- RENDERIZAR FEED ---
function renderizar(uidFiltro = null) {
    onValue(ref(db, 'posts'), snap => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";
        let count = 0;
        snap.forEach(p => {
            const d = p.val();
            if (uidFiltro && d.userId !== uidFiltro) return;
            count++;
            const autor = d.userEmail.split('@')[0];
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${d.url}">
                <div class="info">
                    <h3>${d.title}</h3>
                    <p onclick="verPerfil('${d.userId}', '${autor}')">@${autor}</p>
                </div>`;
            feed.prepend(card);
        });
        if (uidFiltro) document.getElementById('profile-stats').innerHTML = `<b>${count}</b> Publicaciones`;
    });
}

// --- FUNCIONES DE PERFIL ---
window.verPerfil = (uid, nombre) => {
    vistaPerfil = true;
    document.getElementById('profile-header').style.display = 'block';
    document.getElementById('profile-name').innerText = `@${nombre}`;
    onValue(ref(db, `users/${uid}`), s => {
        const d = s.val();
        document.getElementById('profile-bio').innerText = d?.bio || "Sin biografía.";
        document.getElementById('profile-followers').innerHTML = `<b>${d?.seguidores || 0}</b> Seguidores`;
    });
    document.getElementById('btnFollow').onclick = () => {
        if (!userActual) return alert("Inicia sesión");
        update(ref(db, `users/${uid}`), { seguidores: increment(1) });
    };
    renderizar(uid);
};

document.getElementById('btnCerrarPerfil').onclick = () => {
    vistaPerfil = false;
    document.getElementById('profile-header').style.display = 'none';
    renderizar();
};

// --- SUBIDA A CLOUDINARY ---
document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;
    if(!file || !userActual) return alert("Faltan datos");

    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'blip_unsigned');

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/dz9s37bk0/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if(data.secure_url) {
            await push(ref(db, 'posts'), {
                url: data.secure_url, title: title, userId: userActual.uid, userEmail: userActual.email, timestamp: serverTimestamp()
            });
            document.getElementById('modalUpload').style.display = 'none';
        }
    } catch (e) { alert("Error al subir"); }
    btn.innerText = "Publicar";
};

// --- SESIÓN ---
onAuthStateChanged(auth, u => {
    userActual = u;
    document.getElementById('btnOpenUpload').style.display = u ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = u ? `@${u.email.split('@')[0]}` : 'Entrar';
});

document.getElementById('btnLogin').onclick = () => {
    if (userActual) {
        verPerfil(userActual.uid, userActual.email.split('@')[0]);
    } else {
        document.getElementById('modalAuth').style.display = 'flex';
    }
};

document.getElementById('btnDoAuth').onclick = async () => {
    const e = document.getElementById('email').value, p = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch {
        const c = await createUserWithEmailAndPassword(auth, e, p);
        await set(ref(db, `users/${c.user.uid}`), { bio: "¡Nuevo artista!", seguidores: 0 });
    }
    document.getElementById('modalAuth').style.display = 'none';
};

document.getElementById('btnHome').onclick = () => {
    document.getElementById('profile-header').style.display = 'none';
    renderizar();
};

renderizar();
