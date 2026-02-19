import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig={
  apiKey:"AIzaSyA5yh8J7Mgij3iZCOEZ2N8r1yhDkLcXsTg",
  authDomain:"almacenamiento-redsocial.firebaseapp.com",
  databaseURL:"https://almacenamiento-redsocial-default-rtdb.firebaseio.com",
  projectId:"almacenamiento-redsocial",
  storageBucket:"almacenamiento-redsocial.firebasestorage.app",
  messagingSenderId:"562861595597",
  appId:"1:562861595597:web:f9e5764ea977b72fa9c284"
};

const cloudName="dz9s37bk0";
const uploadPreset="blip_unsigned";

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);

let user=null;

onAuthStateChanged(auth,u=>{
  if(u){user=u;loadFeed();listenChat();}
  else signInAnonymously(auth);
});

// FEED
function loadFeed(){
  const feed=document.getElementById("feed");
  feed.innerHTML="";
  onChildAdded(ref(db,"posts"),snap=>{
    const post=snap.val();
    const div=document.createElement("div");
    div.className="post";
    div.innerHTML=`
      <img src="${post.image}">
      <div class="post-footer">
        <span>${post.user}</span>
        <span>❤️</span>
      </div>`;
    feed.prepend(div);
  });
}

// CLOUDINARY UPLOAD
window.openUpload=()=>{
  cloudinary.openUploadWidget({
    cloudName,uploadPreset,
    sources:["local","camera"],
    multiple:false,folder:"blip_posts",theme:"purple"
  },(err,res)=>{
    if(!err && res && res.event==="success"){
      push(ref(db,"posts"),{
        user:"Artista_"+user.uid.slice(0,5),
        image:res.info.secure_url,
        time:Date.now()
      });
    }
  });
};

// CHAT
function listenChat(){
  const box=document.getElementById("globalChatBox");
  onChildAdded(ref(db,"globalChat"),snap=>{
    const msg=snap.val();
    const div=document.createElement("div");
    div.className="chat-msg";
    div.innerHTML=`<b>${msg.user}:</b> ${msg.text}`;
    box.appendChild(div);
    box.scrollTop=box.scrollHeight;
  });
}

window.sendChat=()=>{
  const input=document.getElementById("globalInput");
  if(!input.value.trim())return;
  push(ref(db,"globalChat"),{
    user:"User_"+user.uid.slice(0,4),
    text:input.value.trim(),
    time:Date.now()
  });
  input.value="";
};

// UI
document.getElementById("btnUpload").onclick=openUpload;
document.getElementById("btnChat").onclick=()=>document.getElementById("chatPanel").classList.toggle("hidden");
document.getElementById("btnLogout").onclick=()=>signOut(auth);
document.getElementById("globalInput").addEventListener("keypress",e=>{
  if(e.key==="Enter") sendChat();
});
