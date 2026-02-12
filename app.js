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
window.showFollowing = () => { if(!currentUser) return openAuth(); switchView('followingFeed'); renderFollowingFeed(); };
window.showProfile = () => { if(!currentUser) return openAuth(); switchView('profile'); renderProfile(); };

function switchView(id) {
    ['feed', 'followingFeed', 'profile'].forEach(v => {
        const el = document.getElementById(v);
        if(el) el.style.display = (v === id) ? 'grid' : 'none';
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
    if(!file) return alert("Selecciona imagen");

    document.getElementById('uploadLoader').style.display = 'block';
    try {
        const url = await uploadToCloudinary(file);
        const postRef = push(ref(db, 'posts'));
        await set(postRef, { 
            url, title, 
            userId: currentUser.uid, 
            userEmail: currentUser.email, 
            likes: 0, 
            date: Date.now() 
        });
        document.getElementById('modal').style.display = 'none';
    } catch (e) { alert("Error al subir"); }
    finally { document.getElementById('uploadLoader').style.display = 'none'; }
};

// --- RENDERIZADO ---
function createCard(id, p, isOwner = false) {
    const div = document.createElement('div');
    div.className = 'card';
    const isLiked = p.likedBy && currentUser && p.likedBy[currentUser.uid];
    
    div.innerHTML = `
        <img src="${p.url}">
        <div class="info">
            <h3>${p.title}</h3>
            <p style="color:#7b5cff; font-size:0.8rem;">@${p.userEmail.split('@')[0]}</p>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <button onclick="likePost('${id}')" style="background:${isLiked ? '#ff4b2b' : '#333'}">
                    ${isLiked ? '❤️' : '🤍'} ${p.likes || 0}
                </button>
                <button onclick="toggleComments('${id}')" style="background:#444;">💬</button>
                ${(!isOwner && currentUser) ? `<button id="follow_${p.userId}" onclick="toggleFollow('${p.userId}')" style="background:#444; font-size:0.7rem;">Seguir</button>` : ''}
            </div>
            
            <div id="commentSection_${id}" class="comment-section" style="display:none; padding-top:10px;">
                <div id="commentList_${id}" class="comment-list"></div>
                <div class="comment-input-group">
                    <input type="text" id="input_${id}" placeholder="Comentar...">
                    <button onclick="addComment('${id}')">></button>
                </div>
            </div>
            ${isOwner ? `<button class="btn-delete" onclick="deletePost('${id}')">Eliminar</button>` : ''}
        </div>
    `;
    if(!isOwner && currentUser) checkFollowStatus(p.userId);
    return div;
}

// CARGAR FEEDS
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if(feed.style.display !== 'none'){
        feed.innerHTML = '';
        snap.forEach(s => feed.prepend(createCard(s.key, s.val(), s.val().userId === currentUser?.uid)));
    }
});

async function renderFollowingFeed() {
    const grid = document.getElementById('followingFeed');
    const followingSnap = await get(ref(db, `follows/${currentUser.uid}`));
    const followingIds = followingSnap.exists() ? Object.keys(followingSnap.val()) : [];
    
    grid.innerHTML = followingIds.length === 0 ? '<p style="grid-column:1/-1;text-align:center;">No sigues a nadie.</p>' : '';
    
    onValue(ref(db, 'posts'), snap => {
        grid.innerHTML = '';
        snap.forEach(s => { if(followingIds.includes(s.val().userId)) grid.prepend(createCard(s.key, s.val())); });
    });
}

async function renderProfile() {
    const grid = document.getElementById('profileGrid');
    grid.innerHTML = '';
    const snap = await get(ref(db, 'posts'));
    snap.forEach(s => { if(s.val().userId === currentUser.uid) grid.prepend(createCard(s.key, s.val(), true)); });
}

// --- LIKES CORREGIDOS ---
window.likePost = async (id) => {
    if (!currentUser) return openAuth();
    const likeRef = ref(db, `posts/${id}/likedBy/${currentUser.uid}`);
    const postRef = ref(db, `posts/${id}`);
    const snap = await get(likeRef);
    const postSnap = await get(postRef);
    let currentLikes = postSnap.val().likes || 0;

    if (snap.exists()) {
        await remove(likeRef);
        await update(postRef, { likes: Math.max(0, currentLikes - 1) });
    } else {
        await set(likeRef, true);
        await update(postRef, { likes: currentLikes + 1 });
    }
};

// --- COMENTARIOS ---
window.toggleComments = (postId) => {
    const section = document.getElementById(`commentSection_${postId}`);
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
    if(section.style.display === 'block') loadComments(postId);
};

window.addComment = async (postId) => {
    if(!currentUser) return openAuth();
    const val = document.getElementById(`input_${postId}`).value;
    if(!val.trim()) return;
    await push(ref(db, `posts/${postId}/comments`), { text: val, user: currentUser.email.split('@')[0] });
    document.getElementById(`input_${postId}`).value = "";
};

function loadComments(postId) {
    onValue(ref(db, `posts/${postId}/comments`), snap => {
        const list = document.getElementById(`commentList_${postId}`);
        if(!list) return;
        list.innerHTML = "";
        snap.forEach(s => { list.innerHTML += `<p style="font-size:0.8rem; margin:3px 0;"><b>${s.val().user}:</b> ${s.val().text}</p>`; });
    });
}

// --- SEGUIDORES ---
window.toggleFollow = async (artistId) => {
    const followRef = ref(db, `follows/${currentUser.uid}/${artistId}`);
    const snap = await get(followRef);
    if(snap.exists()) await remove(followRef); else await set(followRef, true);
};

function checkFollowStatus(artistId) {
    onValue(ref(db, `follows/${currentUser.uid}/${artistId}`), snap => {
        const btn = document.getElementById(`follow_${artistId}`);
        if(btn) btn.innerText = snap.exists() ? 'Siguiendo' : 'Seguir';
    });
}

window.deletePost = async (id) => { if(confirm("¿Borrar?")) await remove(ref(db, `posts/${id}`)); };

// --- AUTH ---
onAuthStateChanged(auth, user => {
    currentUser = user;
    document.getElementById('uploadBtn').style.display = user ? 'block' : 'none';
    document.getElementById('loginNavBtn').innerText = user ? 'Salir' : 'Entrar';
    if(user) set(ref(db, 'users/' + user.uid), { email: user.email, uid: user.uid });
});

document.getElementById('authBtn').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const action = isLogin ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    action(auth, email, pass).then(()=>document.getElementById('authModal').style.display='none').catch(e=>alert("Error de acceso"));
};

document.getElementById('toggleAuth').onclick = () => { isLogin = !isLogin; document.getElementById('authTitle').innerText = isLogin ? 'Login' : 'Registro'; };
window.openAuth = () => document.getElementById('authModal').style.display='flex';
document.getElementById('uploadBtn').onclick = () => document.getElementById('modal').style.display='flex';
