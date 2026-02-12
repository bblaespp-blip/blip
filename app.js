// ... (Tus imports y firebaseConfig igual que antes)

// --- RENDERIZADO DEL FEED CORREGIDO ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if (!feed) return; // Evita error si el HTML no cargó el div
    
    feed.innerHTML = "";
    
    if (!snap.exists()) {
        feed.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>Aún no hay obras publicadas. ¡Sé el primero!</p>";
        return;
    }

    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        const autorNombre = d.userEmail ? d.userEmail.split('@')[0] : "artista";
        const autorUid = d.userId || "";
        const esMio = userActual && userActual.uid === autorUid;

        let comsHtml = "";
        if(d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                comsHtml += `<div class="comentario"><b>${c.usuario}:</b> ${c.texto}</div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}" onerror="this.src='https://via.placeholder.com/300?text=Error+Cargando+Imagen'">
            <div class="info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>${d.title || 'Sin título'}</h3>
                    ${esMio ? `<button onclick="borrarPost('${id}', '${autorUid}')" class="btn-delete">🗑️</button>` : ''}
                </div>
                <p>@${autorNombre}</p>
                <div class="social-actions">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComs('${id}')">💬</button>
                    <button onclick="seguirUsuario('${autorUid}')" class="btn-follow">Seguir</button>
                </div>
                <div id="box-${id}" class="comments-box" style="display:none;">
                    <div class="comments-list">${comsHtml || "Sin comentarios"}</div>
                    <div class="com-input-group">
                        <input type="text" id="input-${id}" placeholder="Comentar...">
                        <button onclick="enviarComentario('${id}')">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});
