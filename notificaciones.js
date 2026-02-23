import { getDatabase, ref, push, onValue, query, limitToLast } 
from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const db = getDatabase();
const sonidoNoti = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_73147986c4.mp3');
let primeraCarga = true;

// --- ENVIAR NOTIFICACIÓN ---
export function enviarNoti(userActual, uidDestino, msj, extra = {}) {
    if (!userActual || uidDestino === userActual.uid) return;
    push(ref(db, `notificaciones/${uidDestino}`), {
        u: userActual.displayName,
        p: userActual.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
        m: msj,
        t: Date.now(),
        fromUid: userActual.uid,
        ...extra // Aquí incluimos pid (Post ID) o pUrl (Foto)
    });
}

// --- ESCUCHAR NOTIFICACIONES ---
export function inicializarNotificaciones(uid) {
    const badge = document.getElementById('noti-badge') || document.getElementById('noti-count');
    const list = document.getElementById('noti-list');

    onValue(query(ref(db, `notificaciones/${uid}`), limitToLast(15)), snap => {
        if (snap.exists()) {
            if (badge) badge.style.display = 'block';
            
            // Sonar solo en notificaciones nuevas tras la carga inicial
            if (!primeraCarga) {
                sonidoNoti.play().catch(() => console.log("Permiso de audio requerido"));
            }
            primeraCarga = false;

            if (list) {
                list.innerHTML = "";
                snap.forEach(n => {
                    const d = n.val();
                    const item = document.createElement('div');
                    item.className = "noti-item";
                    item.style = "padding:12px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:10px; font-size:13px; color:black; cursor:pointer;";
                    item.innerHTML = `
                        <img src="${d.p}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                        <span><b>${d.u}</b> ${d.m}</span>
                    `;

                    // Lógica de redirección al hacer click
                    item.onclick = () => {
                        if (d.m.includes("mensaje")) {
                            // Si es mensaje, intentamos abrir chat privado (requiere lógica en index.html)
                            if (window.abrirPrivado) window.abrirPrivado(d.fromUid, d.u);
                            else {
                                localStorage.setItem('openChat', `${d.fromUid}|${d.u}`);
                                window.location.href = 'index.html';
                            }
                        } else if (d.pid) {
                            // Si es interacción en post, abrir modal
                            if (window.abrirInteracciones) window.abrirInteracciones(d.pid, d.pUrl);
                            else window.location.href = 'index.html';
                        }
                        const panel = document.getElementById('noti-box') || document.getElementById('noti-panel');
                        if (panel) panel.style.display = 'none';
                    };
                    list.prepend(item);
                });
            }
        } else {
            if (list) list.innerHTML = "<p style='padding:20px; text-align:center; color:#999;'>Sin avisos</p>";
            primeraCarga = false;
        }
    });
}