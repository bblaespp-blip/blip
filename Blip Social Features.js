import { getDatabase, ref, onValue, update, get, push, set } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const db = getDatabase();
const auth = getAuth();
let currentUser = null;

onAuthStateChanged(auth, user => {
    if(user) {
        currentUser = user;
        initPrivateChats();
    }
});

function initPrivateChats() {
    const contactsDiv = document.getElementById('contacts');
    onValue(ref(db, 'users'), snapshot => {
        contactsDiv.innerHTML = '<h4>Artistas</h4>';
        snapshot.forEach(s => {
            const user = s.val();
            if(user.uid !== currentUser.uid) {
                const btn = document.createElement('button');
                btn.style.display = 'block';
                btn.style.marginBottom = '5px';
                btn.innerText = user.email.split('@')[0];
                btn.onclick = () => openChat(user.uid, user.email);
                contactsDiv.appendChild(btn);
            }
        });
    });
}

window.openChat = (peerId, peerName) => {
    const chatDiv = document.getElementById('chatWindow');
    chatDiv.style.display = 'flex';
    chatDiv.innerHTML = `<h3>Chat: ${peerName.split('@')[0]}</h3><div id="msgBox" style="flex:1; overflow-y:auto"></div>`;
    
    const input = document.createElement('input');
    const sendBtn = document.createElement('button');
    sendBtn.innerText = 'Enviar';
    chatDiv.append(input, sendBtn);

    const chatPath = currentUser.uid < peerId ? `${currentUser.uid}_${peerId}` : `${peerId}_${currentUser.uid}`;
    
    onValue(ref(db, `chats/${chatPath}`), snap => {
        const msgBox = document.getElementById('msgBox');
        msgBox.innerHTML = '';
        snap.forEach(m => {
            const msg = m.val();
            msgBox.innerHTML += `<p><b>${msg.sender === currentUser.uid ? 'Tú' : 'Él'}:</b> ${msg.text}</p>`;
        });
        msgBox.scrollTop = msgBox.scrollHeight;
    });

    sendBtn.onclick = () => {
        if(!input.value.trim()) return;
        push(ref(db, `chats/${chatPath}`), {
            sender: currentUser.uid,
            text: input.value,
            time: Date.now()
        });
        input.value = '';
    };
};