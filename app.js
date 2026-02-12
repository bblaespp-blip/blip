// app.js
console.log("app.js iniciado");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    onValue,
    update,
    set,
    serverTimestamp,
    get
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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
let perfilActual = null;

const CLOUD_NAME = "dz9s37bk0";
const PRESET = "blip_unsigned";

// ────────────────────────────────────────────────
//  Esperamos DOMContentLoaded (por si acaso)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM completamente cargado → asignando eventos");

    // ─── Botones de navegación ───────────────────────
    const btnParaTi   = document.getElementById('btnParaTi');
    const btnMiPerfil = document.getElementById('btnMiPerfil');
    const btnLogin    = document.getElementById('btnLogin');
    const btnOpenUpload = document.getElementById('btnOpenUpload');

    if (btnParaTi)   btnParaTi.onclick   = () => { perfilActual = null; document.getElementById('profile-header').style.display = 'none'; cargarParaTi(); };
    if (btnMiPerfil) btnMiPerfil.onclick = () => { if (!userActual) return alert("Inicia sesión primero"); abrirPerfil(userActual.uid, userActual.email.split('@')[0]); };
    if (btnLogin)    btnLogin.onclick    = () => userActual ? signOut(auth) : document.getElementById('modalAuth').style.display = 'flex';
    if (btnOpenUpload) btnOpenUpload.onclick = () => document.getElementById('modalUpload').style.display = 'flex';

    // ─── Modal Auth ──────────────────────────────────
    const btnDoAuth = document.getElementById('btnDoAuth');
    if (btnDoAuth) {
        btnDoAuth.onclick = async () => {
            const email = document.getElementById('email')?.value;
            const pass  = document.getElementById('pass')?.value;
            if (!email || !pass) return alert("Completa email y contraseña");

            try {
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (err) {
                try {
                    const cred = await createUserWithEmailAndPassword(auth, email, pass);
                    await set(ref(db, `users/${cred.user.uid}`), {
                        username: email.split('@')[0],
                        bio: "Nuevo artista en BLIP ✨",
                        seguidores: 0
                    });
                } catch (regErr) {
                    alert("Error al registrar: " + regErr.message);
                }
            }
            document.getElementById('modalAuth').style.display = 'none';
        };
    }

    // ─── Subir obra ──────────────────────────────────
    const btnDoUpload = document.getElementById('btnDoUpload');
    if (btnDoUpload) {
        btnDoUpload.onclick = async () => {
            const file  = document.getElementById('fileInput')?.files[0];
            const title = document.getElementById('postTitle')?.value;

            if (!file || !title) return alert("Falta imagen o título");

            const btn = btnDoUpload;
            btn.textContent = "Subiendo...";
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

                if (data.secure_url) {
                    await push(ref(db, 'posts'), {
                        userId: userActual.uid,
                        username: userActual.email.split('@')[0],
                        title,
                        url: data.secure_url,
                        timestamp: serverTimestamp()
                    });
                    alert("¡Obra publicada!");
                    document.getElementById('modalUpload').style.display = 'none';
                    document.getElementById('postTitle').value = '';
                    cargarParaTi();
                } else {
                    alert("Error en Cloudinary: " + (data.error?.message || "desconocido"));
                }
            } catch (e) {
                console.error(e);
                alert("Error al subir");
            } finally {
                btn.textContent = "Publicar";
                btn.disabled = false;
            }
        };
    }

    // ─── Estado de autenticación ─────────────────────
    onAuthStateChanged(auth, user => {
        userActual = user;
        console.log("Estado de auth cambiado:", user ? user.email : "sin sesión");

        if (btnOpenUpload) {
            btnOpenUpload.style.display = user ? 'block' : 'none';
        }
        if (btnLogin) {
            btnLogin.textContent = user ? 'Salir' : 'Entrar';
        }

        if (user && !perfilActual) {
            cargarParaTi();
        }
    });

    // ─── Cargar feed inicial ─────────────────────────
    cargarParaTi();
});

// ────────────────────────────────────────────────
// Funciones principales
// ────────────────────────────────────────────────

function cargarParaTi() {
    onValue(ref(db, 'posts'), snap => {
        const feed = document.getElementById('feed');
        if (!feed) return;

        feed.innerHTML = "";

        const posts = [];
        snap.forEach(child => {
            posts.push({ id: child.key, ...child.val() });
        });

        posts.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));

        posts.forEach(d => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${d.url}" alt="${d.title}">
                <div class="info">
                    <h3>${d.title}</h3>
                    <p onclick="abrirPerfil('${d.userId}', '${d.username}')" style="color:#7b5cff;">
                        @${d.username}
                    </p>
                </div>
            `;
            feed.appendChild(card);
        });
    });
}

window.abrirPerfil = (uid, username) => {
    perfilActual = uid;
    const header = document.getElementById('profile-header');
    if (header) header.style.display = 'block';

    const nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.textContent = `@${username}`;

    // Datos del usuario
    onValue(ref(db, `users/${uid}`), snap => {
        const data = snap.val() || {};
        const bioEl = document.getElementById('profile-bio');
        if (bioEl) bioEl.textContent = data.bio || "Sin biografía";

        const followersEl = document.getElementById('profile-stats-followers');
        if (followersEl) followersEl.innerHTML = `<b>${data.seguidores || 0}</b> Seguidores`;
    });

    // Posts del usuario
    onValue(ref(db, 'posts'), snap => {
        const feed = document.getElementById('feed');
        if (!feed) return;

        feed.innerHTML = "";
        let count = 0;

        snap.forEach(child => {
            const post = child.val();
            if (post.userId === uid) {
                count++;
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img src="${post.url}" alt="${post.title}">
                    <div class="info">
                        <h3>${post.title}</h3>
                    </div>
                `;
                feed.appendChild(card);
            }
        });

        const postsEl = document.getElementById('profile-stats-posts');
        if (postsEl) postsEl.innerHTML = `<b>${count}</b> Publicaciones`;
    });

    // Botón seguir
    const btnFollow = document.getElementById('btnFollow');
    if (btnFollow) {
        btnFollow.style.display = (userActual && userActual.uid !== uid) ? 'inline-block' : 'none';
        btnFollow.onclick = async () => {
            const curr = (await get(ref(db, `users/${uid}/seguidores`))).val() || 0;
            await update(ref(db, `users/${uid}`), { seguidores: curr + 1 });
            alert("¡Siguiendo!");
        };
    }
};

window.cerrarPerfil = () => {
    perfilActual = null;
    const header = document.getElementById('profile-header');
    if (header) header.style.display = 'none';
    cargarParaTi();
};

console.log("app.js finalizó definición de funciones");
