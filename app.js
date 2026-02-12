// --- DENTRO DE TU FUNCIÓN onValue(ref(db, 'posts')... ---
onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    
    snap.forEach(postSnap => {
        const d = postSnap.val();
        const id = postSnap.key;
        const autor = d.userEmail ? d.userEmail.split('@')[0] : "artista";

        // Construir la lista de comentarios desde Firebase
        let comentariosHTML = "";
        if (d.comentarios) {
            Object.values(d.comentarios).forEach(c => {
                comentariosHTML += `
                    <div style="border-bottom:1px solid #222; padding:5px; font-size:0.8rem;">
                        <b style="color:#7b5cff;">@${c.usuario}:</b> <span style="color:#eee;">${c.texto}</span>
                    </div>`;
            });
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${d.url}">
            <div class="info">
                <h3>${d.title}</h3>
                <p>@${autor}</p>
                <div class="social-bar">
                    <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                    <button onclick="toggleComentarios('${id}')">💬</button>
                </div>
                
                <div id="box-${id}" style="display:none; background:#111; padding:10px; border-radius:8px; margin-top:10px;">
                    <div id="list-${id}" style="max-height:100px; overflow-y:auto; margin-bottom:10px;">
                        ${comentariosHTML}
                    </div>
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="input-${id}" placeholder="Comentar..." style="flex:1; background:#222; color:white; border:1px solid #333; padding:5px; border-radius:4px;">
                        <button onclick="enviarComentario('${id}')" style="background:#7b5cff; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">➤</button>
                    </div>
                </div>
            </div>`;
        feed.prepend(card);
    });
});
