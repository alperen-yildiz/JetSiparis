// Firebase konfigürasyon dosyası
// Firebase SDK'larından gerekli fonksiyonları import et
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Firebase konfigürasyon nesnesi
// Firebase JS SDK v7.20.0 ve sonrası için measurementId opsiyoneldir
const firebaseConfig = {
  apiKey: "AIzaSyAnIsJDAZcz9gIke0_BGoV0ZiAILs9iWtI",
  authDomain: "setsiparis.firebaseapp.com",
  projectId: "setsiparis",
  storageBucket: "setsiparis.firebasestorage.app",
  messagingSenderId: "729504268977",
  appId: "1:729504268977:web:339544760e84d882825890",
  measurementId: "G-F6BVHB588Z"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Analytics'i başlat
const analytics = getAnalytics(app);

// Firebase app instance'ını export et
export { app, analytics };
export default app;