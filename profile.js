import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

const db = getDatabase();

// Variable para saber si estamos en modo perfil o inicio
window.isProfileView = false;

window.verPerfil = (uid, nombre) => {
    window.isProfileView = true; // Bloqueamos actualizaciones del feed global
    
    // 1. Mostrar cabecera de perfil
    const header = document.getElementById('profile-header');
    header.style.display = 'block';
    document.getElementById('profile-name').innerText = `@${nombre}`;
    
    // 2. Filtrar el muro
    const feed = document.getElementById('feed');
    
    onValue(ref(db, 'posts'), snap => {
        if (!window.isProfileView) return; // Si ya salió del perfil, no hacer nada
        
        feed.innerHTML = "";
        let contador = 0;

        snap.forEach(p => {
            const d = p.val();
            if (d.userId === uid) {
                contador++;
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img src="${d.url}">
                    <div class="info">
                        <h3>${d.title}</h3>
                        <p style="opacity:0.6;">En el muro de @${nombre}</p>
                    </div>`;
                feed.prepend(card);
            }
        });

        document.getElementById('profile-stats').innerText = `${contador} Publicaciones`;
        if (contador === 0) feed.innerHTML = "<p style='grid-column:1/-1; text-align:center;'>Este artista aún no ha publicado nada.</p>";
    });
};

window.cerrarPerfil = () => {
    window.isProfileView = false;
    document.getElementById('profile-header').style.display = 'none';
    // Forzamos recarga suave para que app.js vuelva a tomar el control
    location.reload(); 
};
