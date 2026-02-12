import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, push, onValue, update, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

// ... (Tu firebaseConfig se mantiene igual)

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let userActual = null;

// --- NUEVA FUNCIÓN: BORRAR PUBLICACIÓN ---
window.borrarPost = async (postId, autorUid) => {
    if (!userActual || userActual.uid !== autorUid) {
        return alert("No tienes permiso para borrar esta obra.");
    }

    if (confirm("¿Estás seguro de que quieres eliminar esta publicación?")) {
        try {
            await remove(ref(db, `posts/${postId}`));
            alert("Publicación eliminada.");
        } catch (error) {
            alert("Error al eliminar: " + error.message);
        }
    }
};

// --- RENDERIZADO DEL FEED (ACTUALIZADO) ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    
    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const autorNombre = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        const autorUid = d.userId || ""; 

        // Verificar si el usuario actual es el dueño
        const esMio = userActual && userActual.uid === autorUid;

        let comsHtml = "";
        if(d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                comsHtml += `<div style="margin-bottom:5px; border-bottom:1px solid #222; padding-bottom:2px;">
                                <b style="color:#7b5cff;">${c.usuario}:</b> ${c.texto}
                             </div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>${d.title}</h3>
                    ${esMio ? `<button onclick="borrarPost('${id}', '${autorUid}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">🗑️</button>` : ''}
                </div>
                <p>@${autorNombre}</p>
                <div class="social-actions">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComs('${id}')">💬</button>
                    <button onclick="seguirUsuario('${autorUid}')" style="margin-left:auto; border-color:#7b5cff; color:#7b5cff;">Seguir</button>
                </div>
                <div id="box-${id}" class="comments-box" style="display:none; text-align:left;">
                    <div class="comments-list">${comsHtml || "Sin comentarios"}</div>
                    <div class="com-input-group" style="display:flex; gap:5px; margin-top:10px;">
                        <input type="text" id="input-${id}" placeholder="Comentar..." style="flex:1; padding:5px; background:#222; border:1px solid #333; color:white; border-radius:4px;">
                        <button onclick="enviarComentario('${id}')" style="background:#7b5cff; border:none; color:white; padding:0 10px; border-radius:4px; cursor:pointer;">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});

// ... (El resto del código de subida y auth se mantiene igual)
