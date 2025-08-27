// Lisans doğrulama modülü
// Firebase Firestore fonksiyonlarını CDN'den import et
import { 
    collection, 
    query, 
    where, 
    limit, 
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Lisans anahtarını Firestore'da doğrular
 * @param {string} licenseKey - Doğrulanacak lisans anahtarı
 * @returns {Promise<Object>} - Doğrulama sonucu
 */
export async function validateLicense(licenseKey) {
    try {
        // Lisans anahtarını temizle (tire ve boşlukları kaldır)
        const cleanKey = licenseKey.replace(/[-\s]/g, '').toUpperCase();
        
        // Firestore'dan lisans anahtarını sorgula
        const db = window.firebaseDb;
        if (!db) {
            return {
                success: false,
                error: 'Firebase bağlantısı bulunamadı',
                code: 'NO_FIREBASE'
            };
        }
        
        const keysCollection = collection(db, 'keys');
        const q = query(
            keysCollection, 
            where('key', '==', cleanKey),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Lisans anahtarı bulunamadı
        if (querySnapshot.empty) {
            return {
                success: false,
                error: 'Geçersiz lisans anahtarı',
                code: 'INVALID_KEY'
            };
        }
        
        const licenseDoc = querySnapshot.docs[0];
        const licenseData = { id: licenseDoc.id, ...licenseDoc.data() };
        
        // Order kontrolü - sipariş verilmiş mi?
        if (!licenseData.order) {
            return {
                success: false,
                error: 'Lisans anahtarı henüz aktif değil',
                code: 'NOT_ORDERED'
            };
        }
        
        // Plan türünü belirle
        const planType = determinePlanType(licenseData);
        
        // Yıllık plan için tarih kontrolü
        if (planType === 'yearly' && isSubscriptionExpired(licenseData.sub)) {
            return {
                success: false,
                error: 'Lisans süresi dolmuş',
                code: 'EXPIRED',
                expiredDate: licenseData.sub
            };
        }
        
        // Başarılı doğrulama
        return {
            success: true,
            data: {
                key: cleanKey,
                planType: planType,
                subscriptionEnd: licenseData.sub || null,
                isActive: true,
                licenseData: licenseData
            }
        };
        
    } catch (error) {
        console.error('Lisans doğrulama hatası:', error);
        return {
            success: false,
            error: 'Beklenmeyen bir hata oluştu',
            details: error.message
        };
    }
}

/**
 * Plan türünü belirler
 * @param {Object} licenseData - Lisans verisi
 * @returns {string} - Plan türü ('yearly' veya 'unlimited')
 */
function determinePlanType(licenseData) {
    // Sub alanı 'noLimit' ise sınırsız plan
    if (licenseData.sub === 'noLimit') {
        return 'unlimited';
    }
    
    // Sub alanı varsa ve gelecek bir tarihse yıllık plan
    if (licenseData.sub && !isSubscriptionExpired(licenseData.sub)) {
        return 'yearly';
    }
    
    // Diğer tüm durumlar sınırsız plan
    return 'unlimited';
}

/**
 * Abonelik süresinin dolup dolmadığını kontrol eder
 * @param {any} subscriptionDate - Abonelik bitiş tarihi
 * @returns {boolean} - Süre dolmuşsa true
 */
function isSubscriptionExpired(subscriptionDate) {
    if (!subscriptionDate) {
        return false; // Tarih yoksa süresi dolmamış kabul et
    }
    
    try {
        let expiryDate;
        
        // Firestore Timestamp objesi kontrolü
        if (subscriptionDate && typeof subscriptionDate.toDate === 'function') {
            expiryDate = subscriptionDate.toDate();
        }
        // String tarih kontrolü
        else if (typeof subscriptionDate === 'string') {
            expiryDate = new Date(subscriptionDate);
        }
        // Date objesi kontrolü
        else if (subscriptionDate instanceof Date) {
            expiryDate = subscriptionDate;
        }
        // Geçersiz tarih formatı
        else {
            console.warn('Geçersiz abonelik tarihi formatı:', subscriptionDate);
            return false;
        }
        
        // Geçersiz tarih kontrolü
        if (isNaN(expiryDate.getTime())) {
            console.warn('Geçersiz tarih:', subscriptionDate);
            return false;
        }
        
        const now = new Date();
        return expiryDate < now;
        
    } catch (error) {
        console.error('Tarih kontrolü hatası:', error);
        return false; // Hata durumunda süresi dolmamış kabul et
    }
}

/**
 * Lisans anahtarını formatlar (TATPZ3 formatında)
 * @param {string} key - Ham lisans anahtarı
 * @returns {string} - Formatlanmış lisans anahtarı
 */
export function formatLicenseKey(key) {
    const cleanKey = key.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Maksimum 6 karakter sınırı
    return cleanKey.length > 6 ? cleanKey.substring(0, 6) : cleanKey;
}

/**
 * Plan türü açıklamasını döndürür
 * @param {string} planType - Plan türü
 * @returns {string} - Plan açıklaması
 */
export function getPlanDescription(planType) {
    switch (planType) {
        case 'yearly':
            return 'Yıllık Plan';
        case 'unlimited':
            return 'Sınırsız Plan';
        default:
            return 'Bilinmeyen Plan';
    }
}

/**
 * Abonelik bitiş tarihini formatlar
 * @param {any} subscriptionDate - Abonelik tarihi
 * @returns {string} - Formatlanmış tarih
 */
export function formatSubscriptionDate(subscriptionDate) {
    if (!subscriptionDate || subscriptionDate === 'noLimit') {
        return 'Sınırsız';
    }
    
    try {
        let date;
        
        if (subscriptionDate && typeof subscriptionDate.toDate === 'function') {
            date = subscriptionDate.toDate();
        } else if (typeof subscriptionDate === 'string') {
            date = new Date(subscriptionDate);
        } else if (subscriptionDate instanceof Date) {
            date = subscriptionDate;
        } else {
            return 'Geçersiz Tarih';
        }
        
        return new Intl.DateTimeFormat('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
        
    } catch (error) {
        console.error('Tarih formatlama hatası:', error);
        return 'Geçersiz Tarih';
    }
}