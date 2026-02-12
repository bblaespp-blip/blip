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

// --- NAVEGACIÓN ---
const mostrarSeccion = (id) => {
    ['feed', 'followingFeed', 'profile'].forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = (s === id) ? 'grid' : 'none';
    });
};

document.getElementById('btnHome').onclick = () => mostrarSeccion('feed');
document.getElementById('btnFollows').onclick = () => userActual ? mostrarSeccion('followingFeed') : abrirAuth();
document.getElementById('btnProfile').onclick = () => userActual ? mostrarSeccion('profile') : abrirAuth();
document.getElementById('btnOpenUpload').onclick = () => document.getElementById('modalUpload').style.display = 'flex';
document.getElementById('btnLogin').onclick = () => userActual ? signOut(auth) : abrirAuth();

function abrirAuth() { document.getElementById('modalAuth').style.display = 'flex'; }

// --- RENDERIZAR CARTAS ---
function crearCarta(id, datos) {
    const box = document.createElement('div');
    box.className = 'card';
    const yaLike = datos.likedBy && userActual && datos.likedBy[userActual.uid];
    const isOwner = userActual && datos.userId === userActual.uid;
    
    box.innerHTML = `
        <img src="${datos.url}">
        <div class="info">
            <h3>${datos.title}</h3>
            <p style="color:#7b5cff; font-size:0.8rem; margin-bottom:10px;">@${datos.userEmail.split('@')[0]}</p>
            <div class="btns" style="display:flex; gap:5px;">
                <button class="like-btn" style="background:${yaLike ? '#ff4b2b' : '#333'}">❤️ ${datos.likes || 0}</button>
                <button class="comm-toggle" style="background:#444;">💬</button>
                ${(!isOwner && userActual) ? `<button class="follow-btn" id="fbtn-${id}" style="background:#444; font-size:0.7rem;">Seguir</button>` : ''}
            </div>
            
            <div class="comments-area" id="area-${id}" style="display:none;">
                <div class="list" id="list-${id}" style="max-height:120px; overflow-y:auto; margin-bottom:8px;"></div>
                <div style="display:flex; gap:5px;">
                    <input type="text" id="in-${id}" placeholder="Escribe un comentario..." style="flex:1; padding:5px; font-size:0.8rem;">
                    <button class="send-btn" style="padding:5px 10px;">></button>
                </div>
            </div>
        </div>
    `;

    // Eventos de los botones
    box.querySelector('.like-btn').onclick = () => darLike(id, datos.likes || 0);
    box.querySelector('.comm-toggle').onclick = () => {
        const area = document.getElementById(`area-${id}`);
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
        if(area.style.display === 'block') cargarComentarios(id);
    };
    box.querySelector('.send-btn').onclick = () => enviarComentario(id);
    
    // Lógica del botón seguir (Solo si existe el botón)
    const fbtn = box.querySelector('.follow-btn');
    if(fbtn) checkFollowStatus(datos.userId, fbtn);

    return box;
}

// --- LIKES ---
async function darLike(id, numActual) {
    if(!userActual) return abrirAuth();
    const lRef = ref(db, `posts/${id}/likedBy/${userActual.uid}`);
    const pRef = ref(db, `posts/${id}`);
    const snap = await get(lRef);
    if(snap.exists()) {
        await remove(lRef);
        await update(pRef, { likes: Math.max(0, numActual - 1) });
    } else {
        await set(lRef, true);
        await update(pRef, { likes: numActual + 1 });
    }
}

// --- COMENTARIOS ---
function cargarComentarios(id) {
    onValue(ref(db, `posts/${id}/comments`), snap => {
        const div = document.getElementById(`list-${id}`);
        div.innerHTML = "";
        snap.forEach(c => {
            const com = c.val();
            div.innerHTML += `<p><b>${com.user}:</b> ${com.text}</p>`;
        });
        div.scrollTop = div.scrollHeight; // Auto-scroll al último comentario
    });
}

async function enviarComentario(id) {
    const input = document.getElementById(`in-${id}`);
    if(!input.value.trim() || !userActual) return;
    await push(ref(db, `posts/${id}/comments`), {
        text: input.value,
        user: userActual.email.split('@')[0]
    });
    input.value = "";
}

// --- SEGUIDORES ---
function checkFollowStatus(artistUid, btn) {
    if(!userActual) return;
    const fRef = ref(db, `follows/${userActual.uid}/${artistUid}`);
    onValue(fRef, snap => {
        const existe = snap.exists();
        btn.innerText = existe ? 'Siguiendo' : 'Seguir';
        btn.style.background = existe ? '#7b5cff' : '#444';
        
        btn.onclick = async () => {
            if(existe) await remove(fRef);
            else await set(fRef, true);
        };
    });
}

// --- CARGAR FEEDS ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if(feed && feed.style.display !== 'none') {
        feed.innerHTML = "";
        snap.forEach(post => {
            feed.prepend(crearCarta(post.key, post.val()));
        });
    }
});

// --- AUTH LOGIC ---
onAuthStateChanged(auth, user => {
    userActual = user;
    const uploadBtn = document.getElementById('btnOpenUpload');
    if(uploadBtn) uploadBtn.style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';
});

document.getElementById('btnDoAuth').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const f = modoLogin ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    f(auth, email, pass).then(() => {
        document.getElementById('modalAuth').style.display='none';
    }).catch(e => alert("Error: " + e.message));
};

document.getElementById('btnToggleAuth').onclick = () => {
    modoLogin = !modoLogin;
    document.getElementById('authTitle').innerText = modoLogin ? 'Login' : 'Registro';
    document.getElementById('btnToggleAuth').innerText = modoLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra';
};
