import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, update, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const firebaseConfig = { /* tu config */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let userActual = null;
let perfilActual = null; // uid del perfil que estamos viendo

const CLOUD_NAME = "dz9s37bk0";
const PRESET = "blip_unsigned";

// ====================== AUTH ======================
onAuthStateChanged(auth, user => {
    userActual = user;
    document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
    document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';

    if (user && !perfilActual) {
        cargarParaTi(); // mostrar "Para Ti" al iniciar sesión
    }
});

document.getElementById('btnLogin').onclick = () => {
    if (userActual) signOut(auth);
    else document.getElementById('modalAuth').style.display = 'flex';
};

document.getElementById('btnDoAuth').onclick = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await set(ref(db, `users/${cred.user.uid}`), {
            username: email.split('@')[0],
            bio: "Nuevo artista en BLIP ✨",
            seguidores: 0
        });
    }
    document.getElementById('modalAuth').style.display = 'none';
};

// ====================== NAVEGACIÓN ======================
document.getElementById('btnParaTi').onclick = () => {
    perfilActual = null;
    document.getElementById('profile-header').style.display = 'none';
    cargarParaTi();
};

document.getElementById('btnMiPerfil').onclick = () => {
    if (!userActual) return alert("Inicia sesión primero");
    abrirPerfil(userActual.uid, userActual.email.split('@')[0]);
};

// ====================== SUBIR OBRA ======================
document.getElementById('btnOpenUpload').onclick = () => {
    document.getElementById('modalUpload').style.display = 'flex';
};

document.getElementById('btnDoUpload').onclick = async () => {
    const file = document.getElementById('fileInput').files[0];
    const title = document.getElementById('postTitle').value;

    if (!file || !title) return alert("Falta imagen o título");

    const btn = document.getElementById('btnDoUpload');
    btn.innerText = "Subiendo...";
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
                title: title,
                url: data.secure_url,
                timestamp: serverTimestamp()
            });
            alert("¡Obra publicada con éxito!");
            document.getElementById('modalUpload').style.display = 'none';
            document.getElementById('postTitle').value = '';
            cargarParaTi(); // recargar feed
        }
    } catch (e) {
        alert("Error al subir la imagen");
    } finally {
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
};

// ====================== CARGAR "PARA TI" ======================
function cargarParaTi() {
    onValue(ref(db, 'posts'), snap => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";

        const posts = [];
        snap.forEach(child => posts.push({ id: child.key, ...child.val() }));

        // Ordenar por más reciente
        posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        posts.forEach(d => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${d.url}">
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

// ====================== ABRIR PERFIL (propio o ajeno) ======================
window.abrirPerfil = (uid, username) => {
    perfilActual = uid;
    document.getElementById('profile-header').style.display = 'block';
    document.getElementById('profile-name').innerText = `@${username}`;

    // Cargar datos del usuario
    onValue(ref(db, `users/${uid}`), snap => {
        const userData = snap.val() || {};
        document.getElementById('profile-bio').innerText = userData.bio || "Sin biografía";
        document.getElementById('profile-stats-followers').innerHTML = `<b>${userData.seguidores || 0}</b> Seguidores`;
    });

    // Cargar solo posts de este usuario
    onValue(ref(db, 'posts'), snap => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";
        let count = 0;

        snap.forEach(child => {
            const post = child.val();
            if (post.userId === uid) {
                count++;
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img src="${post.url}">
                    <div class="info">
                        <h3>${post.title}</h3>
                    </div>
                `;
                feed.appendChild(card);
            }
        });

        document.getElementById('profile-stats-posts').innerHTML = `<b>${count}</b> Publicaciones`;
    });

    // Botón seguir (solo si no es mi perfil)
    const btnFollow = document.getElementById('btnFollow');
    btnFollow.style.display = (userActual && userActual.uid !== uid) ? 'inline-block' : 'none';
    btnFollow.onclick = async () => {
        await update(ref(db, `users/${uid}`), { seguidores: (await get(ref(db, `users/${uid}/seguidores`))).val() + 1 || 1 });
        alert("¡Siguiendo!");
    };
};

window.cerrarPerfil = () => {
    perfilActual = null;
    document.getElementById('profile-header').style.display = 'none';
    cargarParaTi();
};

// Cargar "Para Ti" al inicio
cargarParaTi();
