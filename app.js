import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

// SUBIR POST
btnDoUpload.onclick = async () => {
    if(!userActual) return alert("Debes iniciar sesión");
    const file = fileInput.files[0];
    if(!file || !postTitle.value) return alert("Completa todo");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{
        method:"POST",
        body:formData
    });

    const data = await res.json();

    await push(ref(db,'posts'),{
        url: data.secure_url,
        title: postTitle.value,
        userEmail: userActual.email,
        userId: userActual.uid,
        time: Date.now()
    });

    modalUpload.style.display="none";
    postTitle.value="";
};

// CARGAR FEED
onValue(ref(db,'posts'),snap=>{
    feed.innerHTML="";
    snap.forEach(p=>{
        const d=p.val();
        const esMio = userActual && d.userId === userActual.uid;

        const card=document.createElement("div");
        card.className="card";
        card.innerHTML=`
        ${esMio?`<button class="deleteBtn" data-id="${p.key}">🗑</button>`:""}
        <img src="${d.url}">
        <div class="info">
            <h3>${d.title}</h3>
            <p>@${d.userEmail.split('@')[0]}</p>
        </div>`;

        feed.prepend(card);
    });
});

// BORRAR POST
feed.onclick=e=>{
    if(e.target.classList.contains("deleteBtn")){
        const id=e.target.dataset.id;
        if(confirm("¿Eliminar esta obra?")){
            remove(ref(db,'posts/'+id));
        }
    }
};

// SESIÓN
onAuthStateChanged(auth,u=>{
    userActual=u;
    btnOpenUpload.style.display=u?"block":"none";
    btnLogin.innerText=u?"Salir":"Entrar";
});

btnLogin.onclick=()=>userActual?signOut(auth):modalAuth.style.display="flex";
btnOpenUpload.onclick=()=>modalUpload.style.display="flex";

btnDoAuth.onclick=()=>{
    const e=email.value,p=pass.value;
    signInWithEmailAndPassword(auth,e,p)
    .catch(()=>createUserWithEmailAndPassword(auth,e,p));
    modalAuth.style.display="none";
};
