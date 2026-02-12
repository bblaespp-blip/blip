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
window.showFeed = () => {
    document.getElementById('feed').style.display = 'grid';
    document.getElementById('followingFeed').style.display = 'none';
    document.getElementById('profile').style.display = 'none';
};

window.showFollowing = () => {
    if(!currentUser) return window.openAuth();
    document.getElementById('feed').style.display = 'none';
    document.getElementById('followingFeed').style.display = 'grid';
    document.getElementById('profile').style.display = 'none';
    renderFollowingFeed();
};

window.showProfile = () => {
    if(!currentUser) return window.openAuth();
    document.getElementById('feed').style.display = 'none';
    document.getElementById('followingFeed').style.display = 'none';
    document.getElementById('profile').style.display = 'grid';
    renderProfile();
};

// --- RENDERIZADO DE CARTAS ---
function createCard(id, p, isOwner = false) {
    const div = document.createElement('div');
    div.className = 'card';
    const isLiked = p.likedBy && currentUser && p.likedBy[currentUser.uid];
    
    div.innerHTML = `
        <img src="${p.url}">
        <div class="info">
            <h3>${p.title}</h3>
            <p style="color:#7b5cff; font-size:0.8rem;">@${p.userEmail ? p.userEmail.split('@')[0] : 'usuario'}</p>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <button onclick="likePost('${id}')" style="background:${isLiked ? '#ff4b2b' : '#333'}">
                    ${isLiked ? '❤️' : '🤍'} ${p.likes || 0}
                </button>
                <button onclick="toggleComments('${id}')" style="background:#444;">💬</button>
                ${(!isOwner && currentUser) ? `<button id="follow_${p.userId}" onclick="toggleFollow('${p.userId}')" style="background:#444; font-size:0.7rem;">Seguir</button>` : ''}
            </div>
            <div id="commentSection_${id}" class="comment-section" style="display:none; padding-top:10px;">
                <div id="commentList_${id}" class="comment-list"></div>
                <div class="comment-input-group" style="display:flex; gap:5px;">
                    <input type="text" id="input_${id}" placeholder="Comentar..." style="flex:1; background:#222; color:#fff; border:1px solid #444; padding:5px; border-radius:5px;">
                    <button onclick="addComment('${id}')" style="padding:5px 10px;">></button>
                </div>
            </div>
            ${isOwner ? `<button class="btn-delete" onclick="deletePost('${id}')" style="background:#ff4b2b; width:100%; margin-top:10px; padding:5px; border-radius:5px; font-size:0.7rem;">Eliminar</button>` : ''}
        </div>
    `;
    if(!isOwner && currentUser) checkFollowStatus(p.userId);
    return div;
}

// --- CARGA DE DATOS ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if(feed) {
        feed.innerHTML = '';
        snap.forEach(s => {
            feed.prepend(createCard(s.key, s.val(), s.val().userId === currentUser?.uid));
        });
    }
});

// --- LIKES ---
window.likePost = async (id) => {
    if (!currentUser) return window.openAuth();
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
    if(!section) return;
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
    if(section.style.display === 'block') {
        onValue(ref(db, `posts/${postId}/comments`), snap => {
            const list = document.getElementById(`commentList_${postId}`);
            if(!list) return;
            list.innerHTML = "";
            snap.forEach(s => { 
                list.innerHTML += `<p style="font-size:0.8rem; margin:3px 0; text-align:left;"><b>${s.val().user}:</b> ${s.val().text}</p>`; 
            });
        });
    }
};

window.addComment = async (postId) => {
    if(!currentUser) return window.openAuth();
    const input = document.getElementById(`input_${postId}`);
    if(!input || !input.value.trim()) return;
    await push(ref(db, `posts/${postId}/comments`), { 
        text: input.value, 
        user: currentUser.email.split('@')[0] 
    });
    input.value = "";
};

// --- SEGUIDORES Y MURO ---
window.toggleFollow = async (artistId) => {
    if(!currentUser) return window.openAuth();
    const followRef = ref(db, `follows/${currentUser.uid}/${artistId}`);
    const snap = await get(followRef);
    if(snap.exists()) await remove(followRef); else await set(followRef, true);
};

function checkFollowStatus(artistId) {
    if(!currentUser) return;
    onValue(ref(db, `follows/${currentUser.uid}/${artistId}`), snap => {
        const btn = document.getElementById(`follow_${artistId}`);
        if(btn) btn.innerText = snap.exists() ? 'Siguiendo' : 'Seguir';
    });
}

async function renderFollowingFeed() {
    const grid = document.getElementById('followingFeed');
    const followingSnap = await get(ref(db, `follows/${currentUser.uid}`));
    const followingIds = followingSnap.exists() ? Object.keys(followingSnap.val()) : [];
    
    grid.innerHTML = followingIds.length === 0 ? '<p style="grid-column:1/-1;text-align:center;">No sigues a nadie.</p>' : '';
    
    onValue(ref(db, 'posts'), snap => {
        if(grid.style.display !== 'none') {
            grid.innerHTML = '';
            snap.forEach(s => { 
                if(followingIds.includes(s.val().userId)) grid.prepend(createCard(s.key, s.val())); 
            });
        }
    });
}

async function renderProfile() {
    const grid = document.getElementById('profileGrid');
    if(!grid) return;
    grid.innerHTML = '';
    const snap = await get(ref(db, 'posts'));
    snap.forEach(s => { if(s.val().userId === currentUser.uid) grid.prepend(createCard(s.key, s.val(), true)); });
}

window.deletePost = async (id) => { if(confirm("¿Borrar obra?")) await remove(ref(db, `posts/${id}`)); };

// --- AUTENTICACIÓN ---
onAuthStateChanged(auth, user => {
    currentUser = user;
    const upBtn = document.getElementById('uploadBtn');
    const logBtn = document.getElementById('loginNavBtn');
    if(upBtn) upBtn.style.display = user ? 'block' : 'none';
    if(logBtn) {
        logBtn.innerText = user ? 'Salir' : 'Entrar';
        logBtn.onclick = user ? () => signOut(auth).then(()=>location.reload()) : () => window.openAuth();
    }
});

window.openAuth = () => { document.getElementById('authModal').style.display = 'flex'; };

const authBtn = document.getElementById('authBtn');
if(authBtn) {
    authBtn.onclick = () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const action = isLogin ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
        action(auth, email, pass).then(() => {
            document.getElementById('authModal').style.display = 'none';
        }).catch(e => alert("Error: Verifica tus datos"));
    };
}

const toggleAuth = document.getElementById('toggleAuth');
if(toggleAuth) {
    toggleAuth.onclick = () => { 
        isLogin = !isLogin; 
        document.getElementById('authTitle').innerText = isLogin ? 'Login' : 'Registro'; 
    };
}

const upBtn = document.getElementById('uploadBtn');
if(upBtn) upBtn.onclick = () => { document.getElementById('modal').style.display = 'flex'; };
