import { getDatabase, ref, push, onValue, query, limitToLast } 
from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const db = getDatabase();
const sonidoNoti = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_73147986c4.mp3');
let primeraCarga = true;

// --- FUNCIÓN PARA ENVIAR NOTIFICACIÓN ---
export function enviarNoti(userActual, uidDestino, msj) {
    if (!userActual || uidDestino === userActual.uid) return;
    push(ref(db, `notificaciones/${uidDestino}`), {
        u: userActual.displayName,
        p: userActual.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
        m: msj,
        t: Date.now()
    });
}

// --- ESCUCHAR NOTIFICACIONES ---
export function inicializarNotificaciones(uid) {
    const badge = document.getElementById('noti-badge');
    const list = document.getElementById('noti-list');

    onValue(query(ref(db, `notificaciones/${uid}`), limitToLast(10)), snap => {
        if (snap.exists()) {
            // Mostrar punto rojo y sonar
            if (badge) badge.style.display = 'block';
            
            if (!primeraCarga) {
                sonidoNoti.play().catch(() => console.log("Permiso de audio requerido"));
            }
            primeraCarga = false;

            // Renderizar lista
            if (list) {
                list.innerHTML = "";
                snap.forEach(n => {
                    const d = n.val();
                    list.innerHTML = `
                        <div class="noti-item" style="padding:12px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:10px; font-size:13px; color:black;">
                            <img src="${d.p}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                            <span><b>${d.u}</b> ${d.m}</span>
                        </div>` + list.innerHTML;
                });
            }
        } else {
            if (list) list.innerHTML = "<p style='padding:20px; text-align:center; color:#999;'>Sin avisos</p>";
            primeraCarga = false;
        }
    });
}

// --- TOGGLE PANEL ---
window.toggleNotis = () => {
    const p = document.getElementById('noti-panel');
    const badge = document.getElementById('noti-badge');
    if (p) {
        const estaAbierto = p.style.display === 'block';
        p.style.display = estaAbierto ? 'none' : 'block';
        if (!estaAbierto && badge) badge.style.display = 'none';
    }
};