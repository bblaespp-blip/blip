import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, set, update, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// -------- CONFIG --------
const firebaseConfig = {
  apiKey: "AIzaSyA5yh8J7Mgij3iZCOEZ2N8r1yhDkLcXsTg",
  authDomain: "almacenamiento-redsocial.firebaseapp.com",
  databaseURL: "https://almacenamiento-redsocial-default-rtdb.firebaseio.com",
  projectId: "almacenamiento-redsocial",
  storageBucket: "almacenamiento-redsocial.appspot.com",
  appId: "1:562861595597:web:a88c0af7d0c8da44a9c284"
};

const CLOUD_NAME = "dz9s37bk0";
const PRESET = "blip_unsigned";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let userActual = null;
let perfilActivo = null;

const feed = document.getElementById('feed');

// -------- AUTH --------
onAuthStateChanged(auth, async user => {
  userActual = user;
  btnOpenUpload.style.display = user ? 'block' : 'none';
  btnLogin.innerText = user ? 'Salir' : 'Entrar';

  if(user){
    await set(ref(db, `users/${user.uid}`), {
      email: user.email,
      username: user.email.split('@')[0]
    });
  }
});

btnLogin.onclick = () => userActual ? signOut(auth) : modalAuth.style.display = 'flex';

btnDoAuth.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, pass.value);
  } catch {
    await createUserWithEmailAndPassword(auth, email.value, pass.value);
  }
  modalAuth.style.display = 'none';
};

// -------- FEED --------
function renderFeed(){
  onValue(ref(db,'posts'), snap => {
    if(perfilActivo) return;
    feed.innerHTML = "";
    snap.forEach(p=>{
      const d=p.val();
      d.id = p.key;
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

      <div class="social">
        <button onclick="likePost('${d.id}')">❤️</button>
        <span id="likes-${d.id}">${d.likes?.count || 0}</span> likes
      </div>

      <div class="comments" id="comments-${d.id}"></div>
      <input placeholder="Comentar..." onkeydown="if(event.key==='Enter') comentar('${d.id}', this)">
    </div>`;

  feed.prepend(card);
  cargarComentarios(d.id);
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
      <button onclick="seguir('${uid}')">Seguir</button>
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
      d.id = p.key;
      if(d.userId===uid) crearPost(d);
    });
  });
}

// -------- FOLLOW --------
window.seguir = async (uid)=>{
  if(!userActual) return alert("Inicia sesión");
  await update(ref(db,`users/${uid}`),{ seguidores: increment(1) });
};

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
      timestamp:serverTimestamp(),
      likes:{count:0}
    });
    modalUpload.style.display='none';
  }

  btnDoUpload.innerText="Publicar";
};

btnHome.onclick=()=>cerrarPerfil();

// -------- LIKES --------
window.likePost = async (id)=>{
  if(!userActual) return alert("Inicia sesión");
  const likeRef = ref(db,`posts/${id}/likes`);
  update(likeRef, { count: increment(1) });
};

// -------- COMENTARIOS --------
window.comentar = async (postId, input)=>{
  if(!userActual || !input.value.trim()) return;
  await push(ref(db,`comments/${postId}`),{
    user:userActual.email.split('@')[0],
    text:input.value,
    timestamp:Date.now()
  });
  input.value="";
};

function cargarComentarios(postId){
  onValue(ref(db,`comments/${postId}`), snap=>{
    const box=document.getElementById(`comments-${postId}`);
    if(!box) return;
    box.innerHTML="";
    snap.forEach(c=>{
      const d=c.val();
      box.innerHTML += `<p style="font-size:.75rem"><b>@${d.user}:</b> ${d.text}</p>`;
    });
  });
}

// -------- CHAT GLOBAL --------
const chatBox = document.getElementById('chat-messages');
const chatInput = document.getElementById('chatText');
const btnSendChat = document.getElementById('btnSendChat');

onValue(ref(db,'globalChat'), snap=>{
  chatBox.innerHTML="";
  snap.forEach(m=>{
    const d=m.val();
    const p=document.createElement('p');
    p.innerHTML=`<b>@${d.user}:</b> ${d.text}`;
    chatBox.appendChild(p);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});

btnSendChat.onclick=()=>{
  if(!userActual || !chatInput.value.trim()) return;
  push(ref(db,'globalChat'),{
    uid:userActual.uid,
    user:userActual.email.split('@')[0],
    text:chatInput.value,
    timestamp:Date.now()
  });
  chatInput.value="";
};

renderFeed();
