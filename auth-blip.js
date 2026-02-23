// auth-blip.js
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getDatabase, ref, set, get, onDisconnect } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js";

export function initAuthSystem(app) {
    const auth = getAuth(app);
    const db = getDatabase(app);
    const provider = new GoogleAuthProvider();

    // Elementos del DOM (asegúrate que los IDs coincidan con tu HTML)
    const ui = {
        modal: document.getElementById('auth-modal'),
        inputName: document.getElementById('reg-name'),
        inputEmail: document.getElementById('reg-email'),
        inputPass: document.getElementById('reg-pass'),
        mainBtn: document.getElementById('btn-auth-execute'),
        tabLogin: document.getElementById('tab-auth-login'),
        tabSignup: document.getElementById('tab-auth-signup'),
        googleBtn: document.getElementById('btn-google')
    };

    let authMode = 'login'; // Estado inicial

    // 1. Alternar entre Login y Registro
    window.switchAuthTab = (mode) => {
        authMode = mode;
        if (mode === 'signup') {
            ui.inputName.classList.remove('hidden');
            ui.mainBtn.innerText = "Crear Cuenta";
            ui.tabSignup.className = "text-primary font-black border-b-2 border-primary pb-1 transition-all";
            ui.tabLogin.className = "text-slate-500 font-bold pb-1 transition-all";
        } else {
            ui.inputName.classList.add('hidden');
            ui.mainBtn.innerText = "Entrar";
            ui.tabLogin.className = "text-primary font-black border-b-2 border-primary pb-1 transition-all";
            ui.tabSignup.className = "text-slate-500 font-bold pb-1 transition-all";
        }
    };

    // 2. Ejecutar Autenticación (Email/Pass)
    ui.mainBtn.onclick = async () => {
        const name = ui.inputName.value;
        const email = ui.inputEmail.value;
        const pass = ui.inputPass.value;

        try {
            if (authMode === 'signup') {
                if(!name || !email || pass.length < 6) throw new Error("Datos incompletos o contraseña muy corta.");
                const res = await createUserWithEmailAndPassword(auth, email, pass);
                await updateProfile(res.user, { 
                    displayName: name, 
                    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}` 
                });
            } else {
                if(!email || !pass) throw new Error("Faltan credenciales.");
                await signInWithEmailAndPassword(auth, email, pass);
            }
            location.reload();
        } catch (err) {
            alert("Error en BLIP Auth: " + err.message);
        }
    };

    // 3. Google Login
    ui.googleBtn.onclick = async () => {
        try {
            const res = await signInWithPopup(auth, provider);
            // Verificar si es usuario nuevo en la DB
            const userRef = ref(db, `online_users/${res.user.uid}`);
            const snapshot = await get(userRef);
            
            if (!snapshot.exists()) {
                // Si es nuevo, mostramos el paso extra de nombre artístico que tienes en el HTML
                document.getElementById('auth-main-ui').classList.add('hidden');
                document.getElementById('setup-profile').classList.remove('hidden');
                document.getElementById('google-custom-name').value = res.user.displayName;
            } else {
                location.reload();
            }
        } catch (err) {
            console.error("Google Auth Error:", err);
        }
    };

    // 4. Cerrar Sesión
    window.logoutBlip = () => {
        signOut(auth).then(() => location.reload());
    };

    return auth;
}