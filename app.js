import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, set, update, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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
let perfilActivo = null;

const CLOUD_NAME = "dz9s37bk0";
const PRESET = "blip_unsigned";

const feed = document.getElementById('feed');

// -------- AUTH --------
onAuthStateChanged(auth, async user => {
  userActual = user;
  document.getElementById('btnOpenUpload').style.display = user ? 'block' : 'none';
  document.getElementById('btnLogin').innerText = user ? 'Salir' : 'Entrar';

  if(user){
    await set(ref(db, `users/${user.uid}`), {
      email: user.email,
      username: user.email.split('@')[0]
    });
  }
});

document.getElementById('btnLogin').onclick = () => {
  userActual ? signOut(auth) : modalAuth.style.display = 'flex';
};

document.getElementById('btnDoAuth').onclick = async () => {
  const e = email.value, p = pass.value;
  try { await signInWithEmailAndPassword(auth,e,p); }
  catch { await createUserWithEmailAndPassword(auth,e,p); }
  modalAuth.style.display='none';
};

// -------- FEED --------
function renderFeed(){
  onValue(ref(db,'posts'), snap => {
    if(perfilActivo) return;
    feed.innerHTML = "";
    snap.forEach(p=>{
      const d=p.val();
      crearPost(d);
    });
  });
}

function crearPost(d){
  const card=document.createElement('div');
  card.className='card';
  const autor=d.userEmail.split('@')[0];
  card.innerHTML=`
    <img src="${d.url}">
    <div class="info">
      <h3>${d.title}</h3>
      <p onclick="verPerfil('${d.userId}','${autor}')">@${autor}</p>
    </div>`;
  feed.prepend(card);
}

// -------- PERFIL --------
window.verPerfil=(uid,nombre)=>{
  perfilActivo=uid;
  const header=document.getElementById('profile-header');
  header.style.display='block';

  onValue(ref(db,`users/${uid}`), snap=>{
    const d=snap.val()||{};
    header.innerHTML=`
      <h2>@${nombre}</h2>
      <p>${d.bio||"Artista en BLIP"}</p>
      <button id="btnFollow">Seguir</button>
      <button onclick="cerrarPerfil()">Volver</button>`;
  });

  renderPerfil(uid);
};

window.cerrarPerfil=()=>{
  perfilActivo=null;
  document.getElementById('profile-header').style.display='none';
  renderFeed();
};

function renderPerfil(uid){
  onValue(ref(db,'posts'), snap=>{
    feed.innerHTML="";
    snap.forEach(p=>{
      const d=p.val();
      if(d.userId===uid) crearPost(d);
    });
  });
}

// -------- SUBIDA --------
btnOpenUpload.onclick=()=>modalUpload.style.display='flex';

btnDoUpload.onclick=async()=>{
  const file=fileInput.files[0];
  if(!file||!userActual) return alert("Falta imagen o sesión");

  btnDoUpload.innerText="Subiendo...";
  const fd=new FormData();
  fd.append('file',file);
  fd.append('upload_preset',PRESET);

  const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{method:'POST',body:fd});
  const data=await res.json();

  if(data.secure_url){
    await push(ref(db,'posts'),{
      url:data.secure_url,
      title:postTitle.value,
      userId:userActual.uid,
      userEmail:userActual.email,
      timestamp:serverTimestamp()
    });
    modalUpload.style.display='none';
  }

  btnDoUpload.innerText="Publicar";
};

btnHome.onclick=()=>cerrarPerfil();

renderFeed();
