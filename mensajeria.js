import { getDatabase, ref, push, onValue, query, limitToLast, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const db = getDatabase();
let chatActivoID = null;

// --- ABRIR CHAT PRIVADO ---
export function abrirChatPrivado(userActual, otroUsuarioID, otroUsuarioNombre) {
    if (!userActual) return alert("Inicia sesión primero");
    if (userActual.uid === otroUsuarioID) return alert("No puedes hablar contigo mismo");

    // Crear un ID único para la pareja (alfabético para que siempre sea el mismo)
    chatActivoID = [userActual.uid, otroUsuarioID].sort().join("_");

    // Mostrar la ventana de chat
    const win = document.getElementById('private-chat-window');
    document.getElementById('chat-privado-titulo').innerText = `Chat con ${otroUsuarioNombre}`;
    win.style.display = 'flex';

    // Escuchar mensajes
    const msjsRef = query(ref(db, `mensajes_privados/${chatActivoID}`), limitToLast(30));
    onValue(msjsRef, snap => {
        const box = document.getElementById('private-messages-list');
        box.innerHTML = "";
        snap.forEach(m => {
            const d = m.val();
            const esMio = d.uid === userActual.uid;
            box.innerHTML += `
                <div style="align-self: ${esMio ? 'flex-end' : 'flex-start'}; 
                            background: ${esMio ? '#7b2cbf' : '#333'}; 
                            color: white; padding: 8px 12px; border-radius: 10px; 
                            max-width: 80%; margin-bottom: 5px; font-size: 13px;">
                    ${d.msg}
                </div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

// --- ENVIAR MENSAJE ---
export function enviarMensajePrivado(userActual, msg) {
    if (!chatActivoID || !msg.trim()) return;
    push(ref(db, `mensajes_privados/${chatActivoID}`), {
        uid: userActual.uid,
        u: userActual.displayName,
        msg: msg,
        time: serverTimestamp()
    });
}
