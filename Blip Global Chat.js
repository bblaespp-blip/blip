import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const db = getDatabase();
const auth = getAuth();

const globalChatDiv = document.createElement('div');
globalChatDiv.id = 'globalChat';
globalChatDiv.style.cssText = 'position:fixed;bottom:80px;right:20px;width:300px;height:350px;background:#222;border-radius:10px;padding:15px;display:none;flex-direction:column;box-shadow:0 0 20px rgba(0,0,0,0.5);z-index:4000;';
globalChatDiv.innerHTML = `<h4>Chat Global</h4><div id="globalMsgs" style="flex:1; overflow-y:auto; font-size:14px; margin-bottom:10px;"></div>
<input id="globalInput" placeholder="Mensaje..." style="width:100%; box-sizing:border-box;">`;

document.body.appendChild(globalChatDiv);

window.toggleGlobalChat = () => {
    globalChatDiv.style.display = globalChatDiv.style.display === 'none' ? 'flex' : 'none';
};

const input = document.getElementById('globalInput');
input.onkeypress = (e) => {
    if(e.key === 'Enter' && auth.currentUser) {
        const msgRef = push(ref(db, 'globalChat'));
        set(msgRef, {
            from: auth.currentUser.email.split('@')[0],
            text: input.value,
            date: Date.now()
        });
        input.value = '';
    }
};

onValue(ref(db, 'globalChat'), snap => {
    const box = document.getElementById('globalMsgs');
    box.innerHTML = '';
    snap.forEach(s => {
        const m = s.val();
        box.innerHTML += `<p style="margin:5px 0"><b>${m.from}:</b> ${m.text}</p>`;
    });
    box.scrollTop = box.scrollHeight;
});
