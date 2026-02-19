const firebaseConfig = {
  // 🔴 PEGA AQUI TU CONFIG DE FIREBASE 🔴
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyA5yh8J7Mgij3iZCOEZ2N8r1yhDkLcXsTg",
  authDomain: "almacenamiento-redsocial.firebaseapp.com",
  databaseURL: "https://almacenamiento-redsocial-default-rtdb.firebaseio.com",
  projectId: "almacenamiento-redsocial",
  storageBucket: "almacenamiento-redsocial.firebasestorage.app",
  messagingSenderId: "562861595597",
  appId: "1:562861595597:web:f9e5764ea977b72fa9c284",
  measurementId: "G-KZXC1T5EFD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

function login(){
  const email = email.value;
  const password = password.value;

  auth.signInWithEmailAndPassword(email,password)
  .then(()=>window.location="blip.html")
  .catch(e=>alert(e.message));
}

function register(){
  const email = email.value;
  const password = password.value;

  auth.createUserWithEmailAndPassword(email,password)
  .then(()=>window.location="blip.html")
  .catch(e=>alert(e.message));
}

function logout(){
  auth.signOut().then(()=>window.location="index.html");
}

// CLOUDINARY
const CLOUD_NAME="dz9s37bk0";
const UPLOAD_PRESET="blip_unsigned";

function uploadPost(){
  const file=document.getElementById("imageInput").files[0];
  const caption=document.getElementById("caption").value;

  if(!file) return alert("Selecciona una imagen");

  const formData=new FormData();
  formData.append("file",file);
  formData.append("upload_preset",UPLOAD_PRESET);

  fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{
    method:"POST",
    body:formData
  })
  .then(res=>res.json())
  .then(data=>{
      db.ref("posts").push({
        img:data.secure_url,
        caption,
        time:Date.now()
      });
      caption.value="";
  });
}

const feed=document.getElementById("feed");

db.ref("posts").on("child_added",snap=>{
  const p=snap.val();
  const div=document.createElement("div");
  div.className="post";
  div.innerHTML=`<img src="${p.img}"><p>${p.caption}</p>`;
  feed.prepend(div);
});

