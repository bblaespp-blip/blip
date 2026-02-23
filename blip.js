import { getDatabase, ref, push, get, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const db = getDatabase();

export async function realizarBlip(userActual, postId) {
    if (!userActual) return alert("Inicia sesión para hacer Blip");

    try {
        const snap = await get(ref(db, `posts/${postId}`));
        if (!snap.exists()) return;

        const original = snap.val();

        await push(ref(db, 'posts'), {
            ...original,
            isBlip: true,
            originalPostId: postId,
            blipperName: userActual.displayName,
            blipperUid: userActual.uid,
            timestamp: serverTimestamp()
        });

        if (original.uid !== userActual.uid) {
            push(ref(db, `notificaciones/${original.uid}`), {
                u: userActual.displayName,
                p: userActual.photoURL,
                m: "hizo Blip a tu obra 🔄",
                fromUid: userActual.uid,
                t: Date.now()
            });
        }

        alert("¡Blip realizado!");
    } catch (e) { 
        console.error("Error Blip:", e); 
    }
}