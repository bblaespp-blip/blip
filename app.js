import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

const CLOUD_NAME = "dz9s37bk0";
const PRESET = "blip_unsigned";

// --- SUBIR OBRA ---
document.getElementById('btnDoUpload').onclick = async () => {

    if (!userActual) return alert("Debes iniciar sesión");

    const file = fileInput.files[0];
    const title = postTitle.value.trim();

    if(!file || !title) return alert("Faltan datos");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if(!data.secure_url) return alert("Error al subir imagen");

    await push(ref(db,'posts'),{
        url: data.secure_url,
        title,
        user: userActual.email,
        uid: userActual.uid,
        time: Date.now()
    });

    modalUpload.style.display = "none";
    fileInput.value = "";
    postTitle.value = "";
};

// --- FEED ---
onValue(ref(db,'posts'), snap => {
    feed.innerHTML = "";
    if(!snap.exists()){
        feed.innerHTML = "<p style='text-align:center;opacity:0.6'>No hay publicaciones</p>";
        return;
    }

    snap.forEach(p => {
        const d = p.val();
        feed.innerHTML = `
            <div class="card">
                <img src="${d.url}">
                <div class="info">
                    <h3>${d.title}</h3>
                    <p>@${d.user.split('@')[0]}</p>
                </div>
            </div>
        ` + feed.innerHTML;
    });
});

// --- AUTH ---
onAuthStateChanged(auth, user => {
    userActual = user;
    btnOpenUpload.style.display = user ? 'block' : 'none';
    btnLogin.innerText = user ? 'Salir' : 'Entrar';
});

btnLogin.onclick = () => {
    userActual ? signOut(auth) : modalAuth.style.display = "flex";
};

btnOpenUpload.onclick = () => modalUpload.style.display = "flex";

btnDoAuth.onclick = async () => {
    const e = email.value;
    const p = pass.value;
    try{
        await signInWithEmailAndPassword(auth,e,p);
    }catch{
        await createUserWithEmailAndPassword(auth,e,p);
    }
    modalAuth.style.display = "none";
};
