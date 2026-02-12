import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
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
window.showFeed = () => switchView('feed');
window.showFollowing = () => { 
    if(!currentUser) return openAuth();
    switchView('followingFeed');
    renderFollowingFeed();
};
window.showProfile = () => { 
    if(!currentUser) return openAuth();
    switchView('profile');
    renderProfile();
};

function switchView(id) {
    ['feed', 'followingFeed', 'profile'].forEach(v => {
        document.getElementById(v).style.display = v === id ? 'grid' : 'none';
    });
}

// --- CLOUDINARY ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "blip_unsigned");
    const res = await fetch(`https://api.cloudinary.com/v1_1/dz9s37bk0/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
}

// --- PUBLICAR ---
document.getElementById('postBtn').onclick = async () => {
    const file = document.getElementById('imgInput').files[0];
    const title = document.getElementById('imgTitle').value || "Arte";
    if(!file) return alert("Selecciona una imagen");
    if(file.size > 2 * 1024 * 1024) return alert("Máximo 2MB");

    document.getElementById('uploadLoader').style.display = 'block';
    document.getElementById('postBtn').disabled = true;

    try {
        const url = await uploadToCloudinary(file);
        const postRef = push(ref(db, 'posts'));
        await set(postRef, {
            url, title, userId: currentUser.uid, userEmail: currentUser.email, likes: 0, date: Date.now()
        });
        document.getElementById('modal').style.display = 'none';
    } catch (e) { alert("Error al subir"); }
    finally {
        document.getElementById('uploadLoader').style.display = 'none';
        document.getElementById('postBtn').disabled = false;
    }
};

// --- RENDERIZADO ---
function createCard(id, p, isOwner = false) {
    const div = document.createElement('div');
    div.className = 'card';
    const isLiked = p.likedBy && p.likedBy[currentUser?.uid];
    div.innerHTML = `
        <img src="${p.url}">
        <div class="info">
            <h3>${p.title}</h3>
            <p style="color:#7b5cff; font-size:0.8rem;">@${p.userEmail.split('@')[0]}</p>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <button onclick="likePost('${id}')" style="background:${isLiked ? '#ff4b2b' : '#333'}">
                    ${isLiked ? '❤️' : '🤍'} ${p.likes || 0}
                </button>
                ${!isOwner ? `<button id="follow_${p.userId}" onclick="toggleFollow('${p.userId}')" style="background:#444; font-size:0.7rem;">Cargando...</button>` : ''}
            </div>
            ${isOwner ? `<button class="btn-delete" onclick="deletePost('${id}')">Eliminar</button>` : ''}
        </div>
    `;
    if(!isOwner && currentUser) checkFollowStatus(p.userId);
    return div;
}

// FEED GLOBAL
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    snap.forEach(s => feed.prepend(createCard(s.key, s.val(), s.val().userId === currentUser?.uid)));
});

// MURO PERSONALIZADO
async function renderFollowingFeed() {
    const grid = document.getElementById('followingFeed');
    const followingSnap = await get(ref(db, `follows/${currentUser.uid}`));
    const followingIds = followingSnap.exists() ? Object.keys(followingSnap.val()) : [];

    if(followingIds.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No sigues a nadie todavía. ¡Explora el contenido global!</p>';
        return;
    }

    onValue(ref(db, 'posts'), snap => {
        grid.innerHTML = '';
        snap.forEach(s => {
            if(followingIds.includes(s.val().userId)) grid.prepend(createCard(s.key, s.val()));
        });
    });
}

// PERFIL
async function renderProfile() {
    const grid = document.getElementById('profileGrid');
    grid.innerHTML = '';
    const snap = await get(ref(db, 'posts'));
    snap.forEach(s => {
        if(s.val().userId === currentUser.uid) grid.prepend(createCard(s.key, s.val(), true));
    });
}

// --- ACCIONES MEJORADAS ---

// LIKE REVERSIBLE
window.likePost = async (id) => {
    if(!currentUser) return openAuth();
    const postRef = ref(db, `posts/${id}`);
    const snap = await get(postRef);
    const p = snap.val();
    const likedBy = p.likedBy || {};
    
    if(likedBy[currentUser.uid]) {
        // Quitar Like
        delete likedBy[currentUser.uid];
        update(postRef, { likedBy, likes: (p.likes > 0 ? p.likes - 1 : 0) });
    } else {
        // Dar Like
        likedBy[currentUser.uid] = true;
        update(postRef, { likedBy, likes: (p.likes || 0) + 1 });
    }
};

// SEGUIR / DEJAR DE SEGUIR
window.toggleFollow = async (artistId) => {
    if(!currentUser) return openAuth();
    const followRef = ref(db, `follows/${currentUser.uid}/${artistId}`);
    const snap = await get(followRef);
    
    if(snap.exists()) {
        await remove(followRef);
    } else {
        await set(followRef, true);
    }
    // Forzar re-render de botones
    checkFollowStatus(artistId);
};

function checkFollowStatus(artistId) {
    if(!currentUser) return; // Si no hay usuario, no intentamos buscar en 'follows'
    
    const followRef = ref(db, `follows/${currentUser.uid}/${artistId}`);
    onValue(followRef, (snap) => {
        const btn = document.getElementById(`follow_${artistId}`);
        if(btn) {
            btn.innerText = snap.exists() ? 'Siguiendo' : 'Seguir';
            btn.style.background = snap.exists() ? '#7b5cff' : '#444';
        }
    });
}
}

window.deletePost = async (id) => {
    if(confirm("¿Borrar esta obra?")) {
        await remove(ref(db, `posts/${id}`));
        renderProfile();
    }
};

// --- AUTH ---
onAuthStateChanged(auth, user => {
    currentUser = user;
    if(user) {
        document.getElementById('uploadBtn').style.display = 'block';
        document.getElementById('loginNavBtn').innerText = 'Salir';
        document.getElementById('loginNavBtn').onclick = () => signOut(auth).then(()=>location.reload());
        set(ref(db, 'users/' + user.uid), { email: user.email, uid: user.uid });
    }
});

document.getElementById('authBtn').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const action = isLogin ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    action(auth, email, pass).then(()=>document.getElementById('authModal').style.display='none').catch(e=>alert(e.message));
};

document.getElementById('toggleAuth').onclick = () => {
    isLogin = !isLogin;
    document.getElementById('authTitle').innerText = isLogin ? 'Login' : 'Registro';
};

window.openAuth = () => document.getElementById('authModal').style.display='flex';
document.getElementById('uploadBtn').onclick = () => document.getElementById('modal').style.display='flex';

