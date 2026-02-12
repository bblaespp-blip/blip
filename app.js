import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, update, get, remove } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

let currentUser = null;
let isLogin = true;

// --- NAVEGACIÓN ---
const switchView = (id) => {
    ['feed', 'followingFeed', 'profile'].forEach(v => {
        const el = document.getElementById(v);
        if(el) el.style.display = (v === id) ? 'grid' : 'none';
    });
};

document.getElementById('btnParaTi').onclick = () => switchView('feed');
document.getElementById('btnSiguiendo').onclick = () => { if(!currentUser) openAuth(); else { switchView('followingFeed'); renderFollowingFeed(); } };
document.getElementById('btnPerfil').onclick = () => { if(!currentUser) openAuth(); else { switchView('profile'); renderProfile(); } };
document.getElementById('loginNavBtn').onclick = () => { if(currentUser) signOut(auth); else openAuth(); };
document.getElementById('uploadBtn').onclick = () => document.getElementById('modal').style.display = 'flex';
document.getElementById('closeModalBtn').onclick = () => document.getElementById('modal').style.display = 'none';

function openAuth() { document.getElementById('authModal').style.display = 'flex'; }

// --- FUNCIONES DE CARTA ---
function createCard(id, p, isOwner = false) {
    const div = document.createElement('div');
    div.className = 'card';
    const isLiked = p.likedBy && currentUser && p.likedBy[currentUser.uid];
    
    div.innerHTML = `
        <img src="${p.url}">
        <div class="info">
            <h3>${p.title}</h3>
            <p style="color:#7b5cff; font-size:0.8rem;">@${p.userEmail ? p.userEmail.split('@')[0] : 'artista'}</p>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <button class="like-btn" data-id="${id}" style="background:${isLiked ? '#ff4b2b' : '#333'}">
                    ${isLiked ? '❤️' : '🤍'} ${p.likes || 0}
                </button>
                <button class="comm-btn" data-id="${id}" style="background:#444;">💬</button>
                ${(!isOwner && currentUser) ? `<button class="follow-btn" data-uid="${p.userId}" style="background:#444; font-size:0.7rem;">Cargando...</button>` : ''}
            </div>
            <div id="commentSection_${id}" style="display:none; margin-top:10px;">
                <div id="commentList_${id}" style="max-height:100px; overflow-y:auto; font-size:0.8rem; text-align:left;"></div>
                <div style="display:flex; gap:2px; margin-top:5px;">
                    <input type="text" id="input_${id}" placeholder=".." style="flex:1; font-size:0.7rem;">
                    <button class="send-comm" data-id="${id}">></button>
                </div>
            </div>
            ${isOwner ? `<button class="del-btn" data-id="${id}" style="background:#ff4b2b; width:100%; margin-top:5px; font-size:0.6rem;">Eliminar</button>` : ''}
        </div>
    `;

    // Asignar eventos a los botones internos
    div.querySelector('.like-btn').onclick = () => handleLike(id);
    div.querySelector('.comm-btn').onclick = () => toggleComments(id);
    if(div.querySelector('.send-comm')) div.querySelector('.send-comm').onclick = () => addComment(id);
    if(div.querySelector('.del-btn')) div.querySelector('.del-btn').onclick = () => deletePost(id);
    if(div.querySelector('.follow-btn')) checkFollowStatus(p.userId, div.querySelector('.follow-btn'));

    return div;
}

// --- LOGICA DE DATOS ---
async function handleLike(id) {
    if(!currentUser) return openAuth();
    const postRef = ref(db, `posts/${id}`);
    const snap = await get(ref(db, `posts/${id}/likedBy/${currentUser.uid}`));
    const postSnap = await get(postRef);
    const likes = postSnap.val().likes || 0;
    if(snap.exists()) {
        await remove(ref(db, `posts/${id}/likedBy/${currentUser.uid}`));
        await update(postRef, { likes: Math.max(0, likes - 1) });
    } else {
        await set(ref(db, `posts/${id}/likedBy/${currentUser.uid}`), true);
        await update(postRef, { likes: likes + 1 });
    }
}

function toggleComments(id) {
    const sec = document.getElementById(`commentSection_${id}`);
    sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
    if(sec.style.display === 'block') {
        onValue(ref(db, `posts/${id}/comments`), snap => {
            const list = document.getElementById(`commentList_${id}`);
            list.innerHTML = "";
            snap.forEach(s => { list.innerHTML += `<p><b>${s.val().user}:</b> ${s.val().text}</p>`; });
        });
    }
}

async function addComment(id) {
    const input = document.getElementById(`input_${id}`);
    if(!input.value.trim() || !currentUser) return;
    await push(ref(db, `posts/${id}/comments`), { text: input.value, user: currentUser.email.split('@')[0] });
    input.value = "";
}

function checkFollowStatus(uid, btn) {
    onValue(ref(db, `follows/${currentUser.uid}/${uid}`), snap => {
        btn.innerText = snap.exists() ? 'Siguiendo' : 'Seguir';
        btn.onclick = async () => {
            const fRef = ref(db, `follows/${currentUser.uid}/${uid}`);
            if((await get(fRef)).exists()) await remove(fRef); else await set(fRef, true);
        };
    });
}

// --- CARGA DE FEEDS ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if(feed && feed.style.display !== 'none') {
        feed.innerHTML = '';
        snap.forEach(s => feed.prepend(createCard(s.key, s.val(), s.val().userId === currentUser?.uid)));
    }
});

async function renderProfile() {
    const grid = document.getElementById('profileGrid');
    grid.innerHTML = '';
    const snap = await get(ref(db, 'posts'));
    snap.forEach(s => { if(s.val().userId === currentUser.uid) grid.prepend(createCard(s.key, s.val(), true)); });
}

// --- AUTH ---
onAuthStateChanged(auth, user => {
    currentUser = user;
    document.getElementById('uploadBtn').style.display = user ? 'block' : 'none';
    document.getElementById('loginNavBtn').innerText = user ? 'Salir' : 'Entrar';
});

document.getElementById('authBtn').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const action = isLogin ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    action(auth, email, pass).then(() => document.getElementById('authModal').style.display = 'none').catch(e => alert("Error"));
};

document.getElementById('toggleAuth').onclick = () => {
    isLogin = !isLogin;
    document.getElementById('authTitle').innerText = isLogin ? 'Login' : 'Registro';
};
