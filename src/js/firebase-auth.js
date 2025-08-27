// Firebase Authentication servisi
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { app } from "./firebase-config.js";

// Auth instance'ını al
const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Kullanıcı giriş işlemi
 * @param {string} email - Kullanıcı email adresi
 * @param {string} password - Kullanıcı şifresi
 * @returns {Promise} - Firebase auth sonucu
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Kullanıcı kayıt işlemi
 * @param {string} email - Kullanıcı email adresi
 * @param {string} password - Kullanıcı şifresi
 * @param {string} displayName - Kullanıcı adı (opsiyonel)
 * @returns {Promise} - Firebase auth sonucu
 */
export const registerUser = async (email, password, displayName = null) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Kullanıcı adını güncelle
    if (displayName) {
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Google ile giriş işlemi
 * @returns {Promise} - Firebase auth sonucu
 */
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Kullanıcı çıkış işlemi
 * @returns {Promise} - Çıkış sonucu
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Şifre sıfırlama email'i gönder
 * @param {string} email - Kullanıcı email adresi
 * @returns {Promise} - Email gönderim sonucu
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Kullanıcı durumu değişikliklerini dinle
 * @param {Function} callback - Durum değişikliği callback fonksiyonu
 * @returns {Function} - Unsubscribe fonksiyonu
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Mevcut kullanıcıyı al
 * @returns {Object|null} - Mevcut kullanıcı veya null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Auth instance'ını export et
export { auth };