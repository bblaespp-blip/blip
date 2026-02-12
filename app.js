import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

let currentUser = null;

// CLOUDINARY
const CLOUD_NAME = "dz9s37bk0";
const PRESET = "blip_unsigned";

// --- LOGIN ---
btnLogin.onclick = () => {
  currentUser ? signOut(auth) : modalAuth.style.display = 'flex';
};

btnDoAuth.onclick = async () => {
  const e = email.value;
  const p = pass.value;
  try {
    await signInWithEmailAndPassword(auth,e,p);
  } catch {
    await createUserWithEmailAndPassword(auth,e,p);
  }
  modalAuth.style.display = 'none';
};

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if(user){
    await set(ref(db,'users/'+user.uid),{
      email:user.email,
      username:user.email.split('@')[0]
    });
  }

  btnUpload.style.display = user ? 'inline-block':'none';
  btnProfile.style.display = user ? 'inline-block':'none';
  btnLogin.innerText = user ? 'Salir':'Entrar';

  loadFeed();
});

// --- SUBIR ---
btnUpload.onclick = ()=> modalUpload.style.display='flex';

btnDoUpload.onclick = async ()=>{
  const file = fileInput.files[0];
  if(!file || !postTitle.value) return alert("Completa todo");

  const fd = new FormData();
  fd.append('file',file);
  fd.append('upload_preset',PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{
    method:'POST',
    body:fd
  });
  const data = await res.json();

  await push(ref(db,'posts'),{
    url:data.secure_url,
    title:postTitle.value,
    userUID:currentUser.uid,
    userEmail:currentUser.email,
    time:Date.now()
  });

  modalUpload.style.display='none';
  postTitle.value='';
};

// --- FEED PERSONAL ---
async function loadFeed(){
  if(!currentUser) return;

  const feed = document.getElementById('feed');
  const followSnap = await get(ref(db,`users/${currentUser.uid}/siguiendo`));
  const following = followSnap.val() || {};

  onValue(ref(db,'posts'), snap=>{
    feed.innerHTML='';
    snap.forEach(p=>{
      const d = p.val();
      if(following[d.userUID] || d.userUID===currentUser.uid){
        feed.innerHTML+=`
        <div class="card" onclick="showProfile('${d.userUID}')">
          <img src="${d.url}">
          <div class="info">
            <h3>${d.title}</h3>
            <p>@${d.userEmail.split('@')[0]}</p>
          </div>
        </div>`;
      }
    });
  });
}

window.showFeed = ()=>{
  feed.style.display='grid';
  profileView.style.display='none';
  loadFeed();
}

// --- PERFIL ---
window.showProfile = async (uid)=>{
  feed.style.display='none';
  profileView.style.display='block';

  const userSnap = await get(ref(db,'users/'+uid));
  const u = userSnap.val();

  profileHeader.innerHTML=`
  <div style="display:flex;gap:20px;align-items:center;padding:25px">
    <h2>@${u.username}</h2>
    ${uid!==currentUser.uid?`<button onclick="follow('${uid}')">Seguir</button>`:''}
  </div>`;

  onValue(ref(db,'posts'), snap=>{
    profileFeed.innerHTML='';
    snap.forEach(p=>{
      const d=p.val();
      if(d.userUID===uid){
        profileFeed.innerHTML+=`
        <div class="card">
          <img src="${d.url}">
          <div class="info"><h3>${d.title}</h3></div>
        </div>`;
      }
    });
  });
};

// --- FOLLOW ---
window.follow = async(uid)=>{
  await set(ref(db,`users/${currentUser.uid}/siguiendo/${uid}`),true);
  alert("Ahora sigues a este artista");
};

btnProfile.onclick=()=>showProfile(currentUser.uid);
btnHome.onclick=()=>showFeed();
