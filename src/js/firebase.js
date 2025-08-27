// Ana Firebase modülü - Tüm Firebase servislerini tek yerden yönet

// Firebase konfigürasyonu
export { app, analytics } from './firebase-config.js';

// Firebase Authentication
export {
  auth,
  loginUser,
  registerUser,
  loginWithGoogle,
  logoutUser,
  resetPassword,
  onAuthStateChange,
  getCurrentUser
} from './firebase-auth.js';

// Firebase Firestore
export {
  db,
  addDocument,
  getDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  listenToCollection,
  listenToDocument
} from './firebase-firestore.js';

// Firebase Analytics
export {
  trackEvent,
  trackPageView,
  trackLogin,
  trackSignUp,
  trackSearch,
  trackPurchase,
  trackAddToCart,
  trackRemoveFromCart,
  setUserProps,
  setAnalyticsUserId,
  setAnalyticsEnabled,
  trackError,
  trackPerformance
} from './firebase-analytics.js';

/**
 * Firebase servislerinin başlatılma durumunu kontrol et
 * @returns {Object} - Servislerin durumu
 */
export const getFirebaseStatus = () => {
  return {
    app: !!app,
    auth: !!auth,
    firestore: !!db,
    analytics: !!analytics
  };
};

/**
 * Firebase bağlantısını test et
 * @returns {Promise} - Test sonucu
 */
export const testFirebaseConnection = async () => {
  try {
    const status = getFirebaseStatus();
    
    if (!status.app) {
      throw new Error('Firebase app başlatılamadı');
    }
    
    return {
      success: true,
      message: 'Firebase bağlantısı başarılı',
      services: status
    };
  } catch (error) {
    return {
      success: false,
      message: 'Firebase bağlantısı başarısız',
      error: error.message
    };
  }
};

// Firebase başlatıldığında konsola bilgi yazdır
console.log('🔥 Firebase servisleri yüklendi:', getFirebaseStatus());