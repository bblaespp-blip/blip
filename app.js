import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

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

const feed = document.getElementById('feed');
const profile = document.getElementById('profile');
const profileGrid = document.getElementById('profileGrid');
const explore = document.getElementById('explore');
const modal = document.getElementById('modal');
const authModal = document.getElementById('authModal');
const uploadBtn = document.getElementById('uploadBtn');
const postBtn = document.getElementById('postBtn');
const authBtn = document.getElementById('authBtn');
const toggleAuthBtn = document.getElementById('toggleAuth');

let isLogin = true;
let currentUserEmail = '';

// Notificaciones
const notifIcon = document.createElement('div');
notifIcon.id = 'notifIcon';
notifIcon.style.cssText = 'position:fixed;top:80px;right:25px;background:#7b5cff;color:#fff;padding:10px 15px;border-radius:12px;cursor:pointer;z-index:10000;';
notifIcon.innerText = '🔔 0';
document.body.appendChild(notifIcon);
let notifCount = 0;

notifIcon.addEventListener('click',()=>{ alert('Tienes '+notifCount+' nuevas notificaciones'); notifCount=0; notifIcon.innerText='🔔 0'; });

// Navegación
window.showFeed = () => { feed.style.display='grid'; profile.style.display='none'; explore.style.display='none'; }
window.showProfile = () => { feed.style.display='none'; profile.style.display='grid'; explore.style.display='none'; }
window.showExplore = () => { feed.style.display='none'; profile.style.display='none'; explore.style.display='grid'; }

// Modales
uploadBtn.addEventListener('click',()=>{ modal.style.display='flex'; });
modal.onclick=e=>{ if(e.target===modal) modal.style.display='none'; };
authModal.onclick=e=>{ if(e.target===authModal) authModal.style.display='none'; };

// Cloudinary upload
async function uploadToCloudinary(file){
  const cloudName="dz9s37bk0";
  const uploadPreset="blip_unsigned";
  const url=`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData=new FormData();
  formData.append("file",file);
  formData.append("upload_preset",uploadPreset);
  const res=await fetch(url,{method:"POST",body:formData});
  const data=await res.json();
  return data.secure_url;
}

// Subir post
postBtn.addEventListener('click', async ()=>{
  const file=document.getElementById('imgInput').files[0];
  const title=document.getElementById('imgTitle').value||"Arte BLIP";
  if(!file) return alert("Selecciona una imagen");
  const url = await uploadToCloudinary(file);
  const postRef = push(ref(db,'posts'));
  set(postRef, { url, title, user: currentUserEmail, date: Date.now(), likes:0, likedBy:{}, comments:{}, notifications:{} });
  modal.style.display='none';
});

// Mostrar feed en tiempo real
onValue(ref(db,'posts'), snapshot=>{
  feed.innerHTML=''; profileGrid.innerHTML='';
  snapshot.forEach(s=>{
    const p = s.val(); const postId=s.key;
    const card = document.createElement('div');
    card.className='card';
    const liked = p.likedBy && p.likedBy[currentUserEmail] ? '❤️' : '🤍';
    card.innerHTML = `
      <img src="${p.url}">
      <div class="info"><h3>${p.title}</h3><p>${p.user}</p></div>
      <div class="actions">
        <button id="likeBtn_${postId}">${liked} ${p.likes||0}</button>
      </div>
      <div class="comments" id="comments_${postId}"></div>
      <input id="commentInput_${postId}" placeholder='Escribe un comentario...' style='width:100%;margin-top:5px;padding:5px;border-radius:8px;border:none;'>
      <button onclick="addComment('${postId}')" style='margin-top:5px;'>Comentar</button>
    `;
    feed.prepend(card);
    const clone = card.cloneNode(true);
    profileGrid.prepend(clone);

    // Animación like
    const likeBtn = document.getElementById(`likeBtn_${postId}`);
    likeBtn.addEventListener('click', ()=>{
      likeBtn.classList.add('liked');
      setTimeout(()=>likeBtn.classList.remove('liked'),500);
    });

    // Comentarios
    const commentsDiv = document.getElementById(`comments_${postId}`);
    commentsDiv.innerHTML='';
    for(let c in p.comments){
      const cm=p.comments[c];
      const pTag=document.createElement('p');
      pTag.innerHTML=`<b>${cm.user}:</b> ${cm.text}`;
      pTag.classList.add('commentAnim');
      commentsDiv.appendChild(pTag);
    }
  });
});

// Likes con control por usuario y notificación
window.likePost = (postId)=>{
  const postRef = ref(db,'posts/'+postId);
  onValue(postRef,snap=>{
    const post = snap.val();
    if(!post.likedBy) post.likedBy = {};
    if(post.likedBy[currentUserEmail]) return;
    const newLikes = (post.likes||0)+1;
    post.likedBy[currentUserEmail] = true;
    update(postRef,{likes:newLikes, likedBy:post.likedBy});

    // Agregar notificación para el autor
    if(post.user!==currentUserEmail){
      const notifRef = push(ref(db,'posts/'+postId+'/notifications'));
      set(notifRef,{ type:'like', from:currentUserEmail, date:Date.now() });
    }
  },{onlyOnce:true});
}

// Comentarios y notificación
window.addComment = (postId)=>{
  const text=document.getElementById(`commentInput_${postId}`).value;
  if(!text) return;
  const commentRef = push(ref(db,'posts/'+postId+'/comments'));
  set(commentRef, { user: currentUserEmail, text });
  document.getElementById(`commentInput_${postId}`).value='';

  const commentsDiv = document.getElementById(`comments_${postId}`);
  const pTag = document.createElement('p');
  pTag.innerHTML=`<b>${currentUserEmail}:</b> ${text}`;
  pTag.classList.add('commentAnim');
  commentsDiv.appendChild(pTag);

  // Notificación para autor
  onValue(ref(db,'posts/'+postId),snap=>{
    const post = snap.val();
    if(post.user!==currentUserEmail){
      const notifRef = push(ref(db,'posts/'+postId+'/notifications'));
      set(notifRef,{ type:'comment', from:currentUserEmail, text, date:Date.now() });
      notifCount++; notifIcon.innerText = `🔔 ${notifCount}`;
    }
  },{onlyOnce:true});
}

// Auth
toggleAuthBtn.addEventListener('click', ()=>{
  isLogin = !isLogin;
  document.getElementById('authTitle').innerText = isLogin?'Iniciar sesión':'Crear cuenta';
});

authBtn.addEventListener('click', ()=>{
  const email=document.getElementById('email').value;
  const pass=document.getElementById('password').value;
  if(isLogin){
    signInWithEmailAndPassword(auth,email,pass).then(()=>{
      currentUserEmail = email;
      authModal.style.display='none';
    }).catch(e=>alert(e.message));
  } else {
    createUserWithEmailAndPassword(auth,email,pass).then(()=>{
      currentUserEmail = email;
      authModal.style.display='none';
    }).catch(e=>alert(e.message));
  }
});

window.openAuth = ()=>{ authModal.style.display='flex'; }
window.logout = ()=>{ signOut(auth); location.reload(); }

onAuthStateChanged(auth,user=>{
  if(user){
    currentUserEmail = user.email;
    document.getElementById('nav').innerHTML=`
      <button onclick="showFeed()">Inicio</button>
      <button onclick="showExplore()">Explorar</button>
      <button onclick="showProfile()">Perfil</button>
      <button onclick="logout()">Salir</button>`;
  }
});

// Animaciones CSS
const style = document.createElement('style');
style.innerHTML=`
  .liked{transform:scale(1.5);transition:0.3s;}
  .commentAnim{animation:fadeIn 0.5s;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
`;
document.head.appendChild(style);
function toggleGlobalChat(){
    const chat = document.getElementById('globalChat');
    if(chat){
        chat.style.display = (chat.style.display === 'none' || chat.style.display === '') ? 'block' : 'none';
    }
}