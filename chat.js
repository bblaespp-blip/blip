const chatRef = firebase.database().ref("chat");

function sendMessage(){
  const msg = document.getElementById("msg");
  if(msg.value.trim()=="") return;

  chatRef.push({
    user: firebase.auth().currentUser.email,
    text: msg.value,
    time: Date.now()
  });

  msg.value="";
}

const chatBox = document.getElementById("chat");

chatRef.limitToLast(100).on("child_added", snap=>{
  const m = snap.val();
  const p = document.createElement("p");
  p.innerHTML=`<b>${m.user.split("@")[0]}:</b> ${m.text}`;
  chatBox.appendChild(p);
  chatBox.scrollTop=chatBox.scrollHeight;
});
