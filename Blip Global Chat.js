import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const db = getDatabase();
const auth = getAuth();
let currentUserEmail = '';
let currentUserId = '';

// Crear panel de chat global
const globalChatDiv = document.createElement('div');
globalChatDiv.id = 'globalChat';
globalChatDiv.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);width:400px;height:300px;background:#f0f0f0;border-radius:10px;padding:10px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:10000;';
const chatHeader = document.createElement('h4');
chatHeader.innerText = 'Chat Global';
globalChatDiv.appendChild(chatHeader);
const messagesDiv = document.createElement('div');
messagesDiv.id='globalMessages';
messagesDiv.style.height='220px';
messagesDiv.style.overflowY='auto';
globalChatDiv.appendChild(messagesDiv);
const input = document.createElement('input');
input.id='globalInput';
input.placeholder='Escribe un mensaje...';
input.style.width='75%';
const sendBtn = document.createElement('button');
sendBtn.innerText='Enviar';
globalChatDiv.appendChild(input);
globalChatDiv.appendChild(sendBtn);
document.body.appendChild(globalChatDiv);

onAuthStateChanged(auth,user=>{
  if(user){
    currentUserEmail = user.email;
    currentUserId = user.uid;
  }
});

// Enviar mensaje global
sendBtn.onclick = ()=>{
  const text = input.value.trim();
  if(!text) return;
  const msgRef = push(ref(db,'globalChat'));
  set(msgRef,{ from: currentUserEmail, text, date: Date.now() });
  input.value='';
}

// Mostrar mensajes en tiempo real
onValue(ref(db,'globalChat'),snapshot=>{
  messagesDiv.innerHTML='';
  snapshot.forEach(s=>{
    const msg = s.val();
    const p = document.createElement('p');
    const date = new Date(msg.date);
    p.innerHTML=`<b>${msg.from}</b> [${date.getHours()}:${date.getMinutes()}]: ${msg.text}`;
    messagesDiv.appendChild(p);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});