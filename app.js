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

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dbu9v8v7e/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default"; // Asegúrate de que este preset sea el correcto en tu cuenta

// --- NAVEGACIÓN ---
const mostrarSeccion = (id) => {
    ['feed', 'followingFeed', 'profile'].forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = (s === id) ? 'grid' : 'none';
    });
};

const asignarClick = (id, func) => {
    const el = document.getElementById(id);
    if(el) el.onclick = func;
};

asignarClick('btnHome', () => mostrarSeccion('feed'));
asignarClick('btnFollows', () => userActual ? mostrarSeccion('followingFeed') : abrirAuth());
asignarClick('btnProfile', () => userActual ? mostrarSeccion('profile') : abrirAuth());
asignarClick('btnOpenUpload', () => document.getElementById('modalUpload').style.display = 'flex');
asignarClick('btnLogin', () => userActual ? signOut(auth) : abrirAuth());

function abrirAuth() { document.getElementById('modalAuth').style.display = 'flex'; }

// --- FUNCIÓN PARA PUBLICAR (EL BOTÓN QUE NO FUNCIONABA) ---
asignarClick('btnDoUpload', async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;

    if (!file || !title) return alert("Por favor, selecciona una imagen y ponle un título.");
    if (!userActual) return alert("Debes estar conectado para publicar.");

    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    try {
        // 1. Subir a Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();

        if (data.secure_url) {
            // 2. Guardar en Firebase
            await push(ref(db, 'posts'), {
                url: data.secure_url,
                title: title,
                userId: userActual.uid,
                userEmail: userActual.email,
                likes: 0,
                timestamp: Date.now()
            });

            alert("¡Arte publicado con éxito!");
            document.getElementById('modalUpload').style.display = 'none';
            document.getElementById('postTitle').value = "";
        }
    } catch (err) {
        console.error(err);
        alert("Hubo un error al subir la imagen.");
    } finally {
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
});

// --- RENDERIZAR CARTAS ---
function crearCarta(id, datos) {
    const box = document.createElement('div');
    box.className = 'card';
    const yaLike = datos.likedBy && userActual && datos.likedBy[userActual.uid];
    const esMio = userActual && datos.userId === userActual.uid;
    
    box.innerHTML = `
        <img src="${datos.url}">
        <div class="info">
            <h3>${datos.title}</h3>
            <p style="color:#7b5cff; font-size:0.8rem; margin-bottom:10px;">@${datos.userEmail.split('@')[0]}</p>
            <div class="btns" style="display:flex; gap:5px; justify-content:center;">
                <button class="like-btn" style="background:${yaLike ? '#ff4b2b' : '#333'}">❤️ ${datos.likes || 0}</button>
                <button class="comm-toggle" style="background:#444;">💬</button>
                ${(!esMio && userActual) ? `<button class="follow-btn" style="background:#444; font-size:0.7rem;">Seguir</button>` : ''}
            </div>
            <div class="comments-area" id="area-${id}" style="display:none; margin-top:10px; background:#1a1a1a; padding:10px; border-radius:8px;">
                <div class="list" id="list-${id}" style="max-height:100px; overflow-y:auto; margin-bottom:8px;"></div>
                <div style="display:flex; gap:5px;">
                    <input type="text" id="in-${id}" placeholder="Comentar..." style="flex:1; background:#333; color:white; border:none; border-radius:4px; padding:5px;">
                    <button class="send-btn" style="background:#7b5cff; border:none; color:white; padding:5px 10px; border-radius:4px;">></button>
                </div>
            </div>
        </div>
    `;

    box.querySelector('.like-btn').onclick = () => darLike(id, datos.likes || 0);
    box.querySelector('.comm-toggle').onclick = () => {
        const area = document.getElementById(`area-${id}`);
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
        if(area.style.display === 'block') cargarComentarios(id);
    };
    box.querySelector('.send-btn').onclick = () => enviarComentario(id);
    
    const fbtn = box.querySelector('.follow-btn');
    if(fbtn) manejarSeguimiento(datos.userId, fbtn);

    return box;
}

// (Aquí siguen las funciones de darLike, manejarSeguimiento, cargarComentarios y enviarComentario que ya teníamos...)
// [Mantén el resto del código igual para que no fallen los likes ni comentarios]

async function darLike(id, num) {
    if(!userActual) return abrirAuth();
    const lRef = ref(db, `posts/${id}/likedBy/${userActual.uid}`);
    const snap = await get(lRef);
    if(snap.exists()) {
        await remove(lRef);
        await update(ref(db, `posts/${id}`), { likes: Math.max(0, num - 1) });
    } else {
        await set(lRef, true);
        await update(ref(db, `posts/${id}`), { likes: num + 1 });
    }
}

function manejarSeguimiento(artistaId, boton) {
    if(!userActual) return;
    const fRef = ref(db, `follows/${userActual.uid}/${artistaId}`);
    onValue(fRef, (snap) => {
        const si = snap.exists();
        boton.innerText = si ? 'Siguiendo' : 'Seguir';
        boton.style.background = si ? '#7b5cff' : '#444';
        boton.onclick = async () => si ? await remove(fRef) : await set(fRef, true);
    });
}

function cargarComentarios(id) {
    onValue(ref(db, `posts/${id}/comments`), snap => {
        const l = document.getElementById(`list-${id}`);
        l.innerHTML = "";
        snap.forEach(c => {
            l.innerHTML += `<p style="font-size:0.8rem; margin:5px 0; text-align:left;"><b>${c.val().user}:</b> ${c.val().text}</p>`;
        });
        l.scrollTop = l.scrollHeight;
    });
}

async function enviarComentario(id) {
    const i = document.getElementById(`in-${id}`);
    if(!i.value.trim() || !userActual) return;
    await push(ref(db, `posts/${id}/comments`), { text: i.value, user: userActual.email.split('@')[0] });
    i.value = "";
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

asignarClick('btnDoAuth', () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const f = modoLogin ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    f(auth, email, pass).then(() => document.getElementById('modalAuth').style.display='none').catch(e => alert("Error de acceso"));
});

asignarClick('btnToggleAuth', () => {
    modoLogin = !modoLogin;
    document.getElementById('authTitle').innerText = modoLogin ? 'Login' : 'Registro';
    document.getElementById('btnToggleAuth').innerText = modoLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra';
});
