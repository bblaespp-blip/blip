import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, set, update, increment } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const firebaseConfig = {
apiKey:"AIzaSyA5yh8J7Mgij3iZCOEZ2N8r1yhDkLcXsTg",
authDomain:"almacenamiento-redsocial.firebaseapp.com",
databaseURL:"https://almacenamiento-redsocial-default-rtdb.firebaseio.com",
projectId:"almacenamiento-redsocial",
storageBucket:"almacenamiento-redsocial.appspot.com",
appId:"1:562861595597:web:a88c0af7d0c8da44a9c284"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let userActual = null;

const CLOUD_NAME="dz9s37bk0";
const PRESET="blip_unsigned";

const feed=document.getElementById("feed");
const forYou=document.getElementById("forYou");

onValue(ref(db,"posts"),snap=>renderFeed(snap));

function renderFeed(snap){
feed.innerHTML="";
snap.forEach(p=>{
const d=p.val();
const card=document.createElement("div");
card.className="card";
card.innerHTML=`
<img src="${d.url}">
<div class="info">
<h3>${d.title}</h3>
<p onclick="verPerfil('${d.userId}','${d.userEmail.split('@')[0]}')">@${d.userEmail.split('@')[0]}</p>
</div>`;
feed.prepend(card);
});
}

function cargarParaTi(){
onValue(ref(db,"posts"),snap=>{
forYou.innerHTML="";
let arr=[];
snap.forEach(p=>arr.push(p.val()));
arr.sort(()=>Math.random()-.5);
arr.slice(0,15).forEach(d=>{
const card=document.createElement("div");
card.className="card";
card.innerHTML=`
<img src="${d.url}">
<div class="info">
<h3>${d.title}</h3>
<p>@${d.userEmail.split('@')[0]}</p>
</div>`;
forYou.append(card);
});
});
}

window.verPerfil=(uid,nombre)=>{
document.getElementById("profile-header").style.display="block";
feed.style.display="grid";
forYou.style.display="none";

onValue(ref(db,"users/"+uid),snap=>{
const d=snap.val()||{};
document.getElementById("profile-name").innerText="@"+nombre;
document.getElementById("profile-bio").innerText=d.bio||"Artista en BLIP";
document.getElementById("profile-followers").innerHTML=`<b>${d.seguidores||0}</b> seguidores`;
});

onValue(ref(db,"posts"),snap=>{
feed.innerHTML="";
let c=0;
snap.forEach(p=>{
const d=p.val();
if(d.userId===uid){
c++;
const card=document.createElement("div");
card.className="card";
card.innerHTML=`
<img src="${d.url}">
<div class="info">
<h3>${d.title}</h3>
<p>@${nombre}</p>
</div>`;
feed.prepend(card);
}
});
document.getElementById("profile-stats").innerHTML=`<b>${c}</b> publicaciones`;
});

document.getElementById("btnFollow").onclick=async()=>{
if(!userActual||userActual.uid===uid)return;
await update(ref(db,"users/"+uid),{seguidores:increment(1)});
};
};

window.cerrarPerfil=()=>{
document.getElementById("profile-header").style.display="none";
};

document.getElementById("btnHome").onclick=()=>{
feed.style.display="grid";
forYou.style.display="none";
cerrarPerfil();
};

document.getElementById("btnForYou").onclick=()=>{
feed.style.display="none";
forYou.style.display="grid";
document.getElementById("profile-header").style.display="none";
cargarParaTi();
};

document.getElementById("btnLogin").onclick=()=>{
userActual?signOut(auth):document.getElementById("modalAuth").style.display="flex";
};

document.getElementById("btnOpenUpload").onclick=()=>document.getElementById("modalUpload").style.display="flex";

document.getElementById("btnDoAuth").onclick=async()=>{
const e=email.value,p=pass.value;
try{
await signInWithEmailAndPassword(auth,e,p);
}catch{
const cred=await createUserWithEmailAndPassword(auth,e,p);
await set(ref(db,"users/"+cred.user.uid),{username:e.split('@')[0],bio:"Nuevo artista",seguidores:0});
}
modalAuth.style.display="none";
};

document.getElementById("btnDoUpload").onclick=async()=>{
if(!userActual)return alert("Inicia sesión");
const file=fileInput.files[0];
if(!file)return alert("Selecciona imagen");

const form=new FormData();
form.append("file",file);
form.append("upload_preset",PRESET);

const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{method:"POST",body:form});
const data=await res.json();

if(data.secure_url){
await push(ref(db,"posts"),{
url:data.secure_url,
title:postTitle.value,
userId:userActual.uid,
userEmail:userActual.email,
timestamp:Date.now()
});
modalUpload.style.display="none";
}
};

onAuthStateChanged(auth,u=>{
userActual=u;
btnOpenUpload.style.display=u?"block":"none";
btnLogin.innerText=u?"Salir":"Entrar";
});
