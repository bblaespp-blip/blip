// Dentro de tu onValue(ref(db, 'posts')...
snap.forEach(p => {
    const d = p.val();
    const id = p.key;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <img src="${d.url}">
        <div class="info">
            <h3>${d.title}</h3>
            <p>@${d.userEmail.split('@')[0]}</p>
            
            <div class="social-actions">
                <button onclick="interactuarLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                <button onclick="abrirCajaComentarios('${id}')">💬</button>
                <button onclick="interactuarSeguir('${d.userId}')" class="btn-follow">Seguir</button>
            </div>
            
            <div id="comments-${id}" class="comments-box" style="display:none;">
                <input type="text" id="input-${id}" placeholder="Escribe un comentario...">
                <button onclick="interactuarComentar('${id}')">Enviar</button>
                <div id="list-${id}" class="comments-list"></div>
            </div>
        </div>`;
    feed.prepend(card);
});
