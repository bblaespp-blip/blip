onValue(ref(db, 'posts'), snap => {
    const feed = document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = "";
    
    if (!snap.exists()) {
        feed.innerHTML = "<p style='grid-column:1/-1; text-align:center;'>Sube la primera obra para inaugurar la galería.</p>";
        return;
    }

    snap.forEach(p => {
        const d = p.val();
        const id = p.key;
        
        // Verificamos que la URL exista antes de crear la imagen
        if (d.url) {
            const autorNombre = d.userEmail ? d.userEmail.split('@')[0] : "artista";
            const esMio = (userActual && d.userId) ? (userActual.uid === d.userId) : false;

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${d.url}" alt="${d.title}">
                <div class="info">
                    <div style="display:flex; justify-content:space-between;">
                        <h3>${d.title || 'Sin título'}</h3>
                        ${esMio ? `<button onclick="borrarPost('${id}', '${d.userId}')">🗑️</button>` : ''}
                    </div>
                    <p>@${autorNombre}</p>
                    <div class="social-actions">
                        <button onclick="darLike('${id}', ${d.likes || 0})">❤️ ${d.likes || 0}</button>
                        <button onclick="toggleComs('${id}')">💬</button>
                    </div>
                </div>`;
            feed.prepend(card);
        }
    });
});
