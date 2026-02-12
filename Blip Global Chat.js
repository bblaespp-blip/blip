import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5yh8J7Mgij3iZCOEZ2N8r1yhDkLcXsTg",
  authDomain: "almacenamiento-redsocial.firebaseapp.com",
  databaseURL: "https://almacenamiento-redsocial-default-rtdb.firebaseio.com",
  projectId: "almacenamiento-redsocial"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const chat = document.createElement("div");
chat.style.cssText = "position:fixed;bottom:20px;right:20px;width:300px;height:350px;background:#222;border-radius:10px;padding:10px;display:flex;flex-direction:column;z-index:5000";
chat.innerHTML = `<b>Chat Global</b><div id="msgs" style="flex:1;overflow:auto"></div><input id="msgInput" placeholder="Mensaje">`;

document.body.appendChild(chat);

msgInput.onkeypress = e => {
  if(e.key === "Enter" && auth.currentUser && msgInput.value.trim()){
    push(ref(db,'globalChat'),{
      user: auth.currentUser.email.split('@')[0],
      text: msgInput.value,
      time: Date.now()
    });
    msgInput.value="";
  }
};

onValue(ref(db,'globalChat'), snap => {
  msgs.innerHTML = "";
  snap.forEach(s=>{
    const m=s.val();
    msgs.innerHTML += `<p><b>${m.user}:</b> ${m.text}</p>`;
  });
  msgs.scrollTop = msgs.scrollHeight;
});
