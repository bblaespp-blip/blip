// --- FUNCIÓN DE SUBIDA CORREGIDA ---
document.getElementById('btnDoUpload').onclick = async () => {
    const fileInput = document.getElementById('fileInput');
    const titleInput = document.getElementById('postTitle');
    const btn = document.getElementById('btnDoUpload');

    if (!fileInput.files[0] || !titleInput.value.trim()) {
        return alert("Por favor, selecciona una imagen y escribe un título.");
    }

    btn.innerText = "Subiendo...";
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('upload_preset', UPLOAD_PRESET); // Usa la variable de arriba

        // URL corregida con tu Cloud Name
        const urlCloudinary = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

        const res = await fetch(urlCloudinary, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.secure_url) {
            // Guardar en Firebase
            await push(ref(db, 'posts'), {
                url: data.secure_url,
                title: titleInput.value,
                userId: userActual.uid,
                userEmail: userActual.email,
                timestamp: Date.now()
            });

            alert("¡Arte publicado con éxito!");
            document.getElementById('modalUpload').style.display = 'none';
            titleInput.value = "";
        } else {
            // Esto te dirá si el error es por el Preset o el Cloud Name
            alert("Error de Cloudinary: " + (data.error ? data.error.message : "Desconocido"));
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    } finally {
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
};
