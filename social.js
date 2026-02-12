import { getDatabase, ref, update, push, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const db = getDatabase();

// --- FUNCIÓN DE LIKES ---
export async function darLike(postId, currentLikes) {
    const postRef = ref(db, `posts/${postId}`);
    await update(postRef, {
        likes: (currentLikes || 0) + 1
    });
}

// --- FUNCIÓN DE COMENTARIOS ---
export async function enviarComentario(postId, usuario, texto) {
    if (!texto.trim()) return;
    const comentariosRef = ref(db, `posts/${postId}/comentarios`);
    await push(comentariosRef, {
        usuario: usuario.split('@')[0],
        texto: texto,
        timestamp: Date.now()
    });
}

// --- FUNCIÓN DE SEGUIR ---
export async function seguirUsuario(uidSeguidor, uidSeguido) {
    if (uidSeguidor === uidSeguido) return alert("No puedes seguirte a ti mismo");
    
    const seguimientoRef = ref(db, `users/${uidSeguidor}/siguiendo/${uidSeguido}`);
    await update(seguimientoRef, { activo: true });
    alert("¡Ahora sigues a este artista!");
}