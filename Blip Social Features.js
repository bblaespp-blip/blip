import { getDatabase, ref, set, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const db = getDatabase();
const auth = getAuth();
let currentUserEmail = '';
let currentUserId = '';

onAuthStateChanged(auth,user=>{
  if(user){
    currentUserEmail = user.email;
    currentUserId = user.uid;
    initFollowing();
    initPrivateChats();
  }
});

//////////////////////////
// SEGUIR ARTISTAS
//////////////////////////
function initFollowing(){
  // Botones seguir en cada post
  onValue(ref(db,'posts'), snapshot=>{
    snapshot.forEach(s=>{
      const postId = s.key;
      const post = s.val();
      const postUserId = post.userId || post.user; // asegurarse de tener userId
      if(postUserId && postUserId !== currentUserId){
        const btnId = `followBtn_${postId}`;
        let btn = document.getElementById(btnId);
        if(!btn){
          btn = document.createElement('button');
          btn.id = btnId;
          btn.style.marginLeft='10px';
          btn.innerText='Seguir';
          const card = document.getElementById(`card_${postId}`);
          if(card) card.querySelector('.info').appendChild(btn);
        }
        btn.onclick = ()=>followArtist(postUserId,btn);
        checkFollowing(postUserId,btn);
      }
    });
  });
}

function followArtist(artistId,btn){
  const updates = {};
  updates[`users/${currentUserId}/following/${artistId}`] = true;
  updates[`users/${artistId}/followers/${currentUserId}`] = true;
  update(ref(db),updates);
  btn.innerText='Siguiendo';
}

function checkFollowing(artistId,btn){
  onValue(ref(db,`users/${currentUserId}/following/${artistId}`),snap=>{
    if(snap.exists()) btn.innerText='Siguiendo';
    else btn.innerText='Seguir';
  },{onlyOnce:true});
}

//////////////////////////
// CHATS PRIVADOS
//////////////////////////
function initPrivateChats(){
  // Lista de usuarios para chatear
  const contactsDiv = document.getElementById('contacts');
  onValue(ref(db,'users'), snapshot=>{
    contactsDiv.innerHTML='';
    snapshot.forEach(s=>{
      const user = s.val();
      const userId = s.key;
      if(userId !== currentUserId){
        const btn = document.createElement('button');
        btn.innerText = user.email || user.name || 'Artista';
        btn.onclick = ()=>openChat(userId,user.email);
        contactsDiv.appendChild(btn);
      }
    });
  });
}

function openChat(peerId,peerName){
  const chatDiv = document.getElementById('chatWindow');
  chatDiv.innerHTML = `<h3>Chat con ${peerName}</h3>`;
  const input = document.createElement('input');
  input.placeholder='Escribe un mensaje...';
  input.style.width='80%';
  const sendBtn = document.createElement('button');
  sendBtn.innerText='Enviar';
  chatDiv.appendChild(input);
  chatDiv.appendChild(sendBtn);

  const chatPath = `privateChats/${currentUserId}/${peerId}`;
  onValue(ref(db,chatPath),snap=>{
    chatDiv.querySelectorAll('.message').forEach(m=>m.remove());
    snap.forEach(m=>{
      const msg = m.val();
      const p = document.createElement('p');
      p.className='message';
      p.innerHTML = `<b>${msg.from===currentUserId?'Tú':peerName}:</b> ${msg.text}`;
      chatDiv.appendChild(p);
    });
  });

  sendBtn.onclick = ()=>{
    if(input.value.trim()==='') return;
    const msgRef1 = push(ref(db,`privateChats/${currentUserId}/${peerId}`));
    const msgRef2 = push(ref(db,`privateChats/${peerId}/${currentUserId}`));
    set(msgRef1,{from:currentUserId,text:input.value});
    set(msgRef2,{from:currentUserId,text:input.value});
    input.value='';
  };
}