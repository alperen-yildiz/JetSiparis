// Firebase Analytics servisi
import { 
  logEvent, 
  setUserProperties, 
  setUserId,
  setCurrentScreen,
  setAnalyticsCollectionEnabled
} from "firebase/analytics";
import { analytics } from "./firebase-config.js";

/**
 * Özel olay kaydet
 * @param {string} eventName - Olay adı
 * @param {Object} eventParameters - Olay parametreleri
 */
export const trackEvent = (eventName, eventParameters = {}) => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, eventParameters);
    }
  } catch (error) {
    console.error('Analytics olay kaydedilemedi:', error);
  }
};

/**
 * Sayfa görüntüleme olayını kaydet
 * @param {string} pageName - Sayfa adı
 * @param {string} pageTitle - Sayfa başlığı
 */
export const trackPageView = (pageName, pageTitle = null) => {
  try {
    if (analytics) {
      logEvent(analytics, 'page_view', {
        page_name: pageName,
        page_title: pageTitle || pageName
      });
      
      // Mevcut ekranı ayarla
      setCurrentScreen(analytics, pageName);
    }
  } catch (error) {
    console.error('Sayfa görüntüleme kaydedilemedi:', error);
  }
};

/**
 * Kullanıcı giriş olayını kaydet
 * @param {string} method - Giriş yöntemi (email, google, vb.)
 */
export const trackLogin = (method = 'email') => {
  try {
    if (analytics) {
      logEvent(analytics, 'login', {
        method: method
      });
    }
  } catch (error) {
    console.error('Giriş olayı kaydedilemedi:', error);
  }
};

/**
 * Kullanıcı kayıt olayını kaydet
 * @param {string} method - Kayıt yöntemi (email, google, vb.)
 */
export const trackSignUp = (method = 'email') => {
  try {
    if (analytics) {
      logEvent(analytics, 'sign_up', {
        method: method
      });
    }
  } catch (error) {
    console.error('Kayıt olayı kaydedilemedi:', error);
  }
};

/**
 * Arama olayını kaydet
 * @param {string} searchTerm - Arama terimi
 * @param {string} category - Arama kategorisi
 */
export const trackSearch = (searchTerm, category = null) => {
  try {
    if (analytics) {
      logEvent(analytics, 'search', {
        search_term: searchTerm,
        category: category
      });
    }
  } catch (error) {
    console.error('Arama olayı kaydedilemedi:', error);
  }
};

/**
 * Satın alma olayını kaydet
 * @param {string} transactionId - İşlem ID'si
 * @param {number} value - Toplam değer
 * @param {string} currency - Para birimi
 * @param {Array} items - Ürün listesi
 */
export const trackPurchase = (transactionId, value, currency = 'TRY', items = []) => {
  try {
    if (analytics) {
      logEvent(analytics, 'purchase', {
        transaction_id: transactionId,
        value: value,
        currency: currency,
        items: items
      });
    }
  } catch (error) {
    console.error('Satın alma olayı kaydedilemedi:', error);
  }
};

/**
 * Sepete ekleme olayını kaydet
 * @param {string} itemId - Ürün ID'si
 * @param {string} itemName - Ürün adı
 * @param {string} category - Ürün kategorisi
 * @param {number} quantity - Miktar
 * @param {number} price - Fiyat
 */
export const trackAddToCart = (itemId, itemName, category, quantity = 1, price = 0) => {
  try {
    if (analytics) {
      logEvent(analytics, 'add_to_cart', {
        currency: 'TRY',
        value: price * quantity,
        items: [{
          item_id: itemId,
          item_name: itemName,
          category: category,
          quantity: quantity,
          price: price
        }]
      });
    }
  } catch (error) {
    console.error('Sepete ekleme olayı kaydedilemedi:', error);
  }
};

/**
 * Sepetten çıkarma olayını kaydet
 * @param {string} itemId - Ürün ID'si
 * @param {string} itemName - Ürün adı
 * @param {string} category - Ürün kategorisi
 * @param {number} quantity - Miktar
 * @param {number} price - Fiyat
 */
export const trackRemoveFromCart = (itemId, itemName, category, quantity = 1, price = 0) => {
  try {
    if (analytics) {
      logEvent(analytics, 'remove_from_cart', {
        currency: 'TRY',
        value: price * quantity,
        items: [{
          item_id: itemId,
          item_name: itemName,
          category: category,
          quantity: quantity,
          price: price
        }]
      });
    }
  } catch (error) {
    console.error('Sepetten çıkarma olayı kaydedilemedi:', error);
  }
};

/**
 * Kullanıcı özelliklerini ayarla
 * @param {Object} properties - Kullanıcı özellikleri
 */
export const setUserProps = (properties) => {
  try {
    if (analytics) {
      setUserProperties(analytics, properties);
    }
  } catch (error) {
    console.error('Kullanıcı özellikleri ayarlanamadı:', error);
  }
};

/**
 * Kullanıcı ID'sini ayarla
 * @param {string} userId - Kullanıcı ID'si
 */
export const setAnalyticsUserId = (userId) => {
  try {
    if (analytics) {
      setUserId(analytics, userId);
    }
  } catch (error) {
    console.error('Kullanıcı ID ayarlanamadı:', error);
  }
};

/**
 * Analytics veri toplama durumunu ayarla
 * @param {boolean} enabled - Etkin/pasif durumu
 */
export const setAnalyticsEnabled = (enabled) => {
  try {
    if (analytics) {
      setAnalyticsCollectionEnabled(analytics, enabled);
    }
  } catch (error) {
    console.error('Analytics durumu ayarlanamadı:', error);
  }
};

/**
 * Hata olayını kaydet
 * @param {string} errorMessage - Hata mesajı
 * @param {string} errorCode - Hata kodu
 * @param {string} location - Hatanın oluştuğu konum
 */
export const trackError = (errorMessage, errorCode = null, location = null) => {
  try {
    if (analytics) {
      logEvent(analytics, 'exception', {
        description: errorMessage,
        error_code: errorCode,
        location: location,
        fatal: false
      });
    }
  } catch (error) {
    console.error('Hata olayı kaydedilemedi:', error);
  }
};

/**
 * Uygulama performans olayını kaydet
 * @param {string} action - Eylem adı
 * @param {number} duration - Süre (milisaniye)
 */
export const trackPerformance = (action, duration) => {
  try {
    if (analytics) {
      logEvent(analytics, 'timing_complete', {
        name: action,
        value: duration
      });
    }
  } catch (error) {
    console.error('Performans olayı kaydedilemedi:', error);
  }
};

// Analytics instance'ını export et
export { analytics };