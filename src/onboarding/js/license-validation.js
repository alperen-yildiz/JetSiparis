// JetArayan Lisans Doğrulama Sistemi
import { getDocuments } from '../../js/firebase-firestore.js';

/**
 * Lisans anahtarını doğrular
 * @param {string} licenseKey - Doğrulanacak lisans anahtarı
 * @returns {Promise<Object>} - Doğrulama sonucu
 */
export const validateLicenseKey = async (licenseKey) => {
    try {
        // Lisans anahtarını temizle ve formatla
        const cleanKey = licenseKey.trim().toUpperCase();
        
        console.log('License validation started for key:', cleanKey);

        // Firebase'den keys koleksiyonunda lisans anahtarını ara
        const result = await getDocuments('keys', {
            where: [{
                field: 'key',
                operator: '==',
                value: cleanKey
            }]
        });

        if (!result.success) {
            return {
                success: false,
                error: 'Veritabanı bağlantı hatası',
                code: 'DATABASE_ERROR'
            };
        }

        // Lisans anahtarı bulunamadı
        if (result.data.length === 0) {
            return {
                success: false,
                error: 'Geçersiz lisans anahtarı',
                code: 'KEY_NOT_FOUND'
            };
        }

        const licenseData = result.data[0];
        console.log('Firebase license data:', licenseData);
        console.log('License sub value:', licenseData.sub);
        console.log('License number:', licenseData.number);

        // Lisans aktif mi kontrol et
        if (!licenseData.number) {
            return {
                success: false,
                error: 'Lisans aktif değil',
                code: 'LICENSE_INACTIVE'
            };
        }

        // Plan türünü belirle
        const planType = determinePlanType(licenseData.sub);
        console.log('Plan type result:', planType);
        
        if (!planType.valid) {
            return {
                success: false,
                error: planType.error,
                code: 'PLAN_EXPIRED'
            };
        }

        return {
            success: true,
            data: {
                licenseKey: cleanKey,
                planType: planType.type,
                expiryDate: planType.expiryDate,
                isUnlimited: planType.type === 'unlimited'
            }
        };

    } catch (error) {
        console.error('Lisans doğrulama hatası:', error);
        return {
            success: false,
            error: 'Beklenmeyen bir hata oluştu',
            code: 'UNEXPECTED_ERROR'
        };
    }
};

// Format kontrolü kaldırıldı - sadece Firebase'den key doğruluğu kontrol ediliyor

/**
 * Plan türünü ve geçerliliğini belirler
 * @param {string|Date} subValue - Abonelik değeri
 * @returns {Object} - Plan bilgileri
 */
function determinePlanType(subValue) {
    console.log('determinePlanType called with subValue:', subValue, 'type:', typeof subValue);
    
    // Sınırsız plan kontrolü
    if (subValue === 'noLimit') {
        console.log('Plan type: unlimited');
        return {
            valid: true,
            type: 'unlimited',
            expiryDate: null
        };
    }

    // Yıllık plan kontrolü
    try {
        // Firebase'den gelen tarih formatını normalize et
        let dateString = subValue;
        
        // Eğer Firebase Timestamp objesi ise
        if (subValue && typeof subValue === 'object' && subValue.seconds) {
            dateString = new Date(subValue.seconds * 1000).toISOString();
        }
        
        const expiryDate = new Date(dateString);
        const currentDate = new Date();
        
        // Tarih geçerliliğini kontrol et
        if (isNaN(expiryDate.getTime())) {
            console.log('Invalid date format:', subValue);
            return {
                valid: false,
                error: 'Geçersiz tarih formatı',
                type: 'invalid'
            };
        }
        
        // Sadece tarih kısmını karşılaştır (saat bilgisini göz ardı et)
        const expiryDateOnly = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
        const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        console.log('Original subValue:', subValue);
        console.log('Parsed expiry date:', expiryDate);
        console.log('Expiry date (date only):', expiryDateOnly);
        console.log('Current date (date only):', currentDateOnly);
        console.log('Is valid (expiry >= current):', expiryDateOnly >= currentDateOnly);

        // Bitiş tarihi bugün veya gelecekte ise geçerli
        if (expiryDateOnly >= currentDateOnly) {
            console.log('Plan type: yearly (valid)');
            return {
                valid: true,
                type: 'yearly',
                expiryDate: expiryDate
            };
        } else {
            console.log('Plan type: expired');
            return {
                valid: false,
                error: 'Lisans süresi dolmuş',
                type: 'expired'
            };
        }
    } catch (error) {
        console.log('Plan type: invalid, error:', error);
        return {
            valid: false,
            error: 'Geçersiz abonelik bilgisi',
            type: 'invalid'
        };
    }
}

// saveLicenseData ve getSavedLicenseData fonksiyonları dosyanın sonunda tanımlanmış

/**
 * Lisans durumunu kontrol et
 * @returns {Object} - Lisans durumu
 */
export const checkLicenseStatus = () => {
    const licenseData = getSavedLicenseData();
    
    if (!licenseData) {
        return {
            valid: false,
            reason: 'Lisans bilgisi bulunamadı'
        };
    }

    // Sınırsız plan kontrolü
    if (licenseData.isUnlimited) {
        return {
            valid: true,
            planType: 'unlimited'
        };
    }

    // Yıllık plan süresi kontrolü
    if (licenseData.expiryDate) {
        const expiryDate = new Date(licenseData.expiryDate);
        const currentDate = new Date();
        
        if (expiryDate > currentDate) {
            return {
                valid: true,
                planType: 'yearly',
                expiryDate: expiryDate
            };
        } else {
            return {
                valid: false,
                reason: 'Lisans süresi dolmuş'
            };
        }
    }

    return {
        valid: false,
        reason: 'Geçersiz lisans bilgisi'
    };
};

/**
 * Lisans verilerini kaydet
 * @param {Object} licenseData - Kaydedilecek lisans verileri
 */
export const saveLicenseData = (licenseData) => {
    try {
        const dataToSave = {
            ...licenseData,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('jetArayanLicense', JSON.stringify(dataToSave));
        console.log('License data saved successfully');
    } catch (error) {
        console.error('Error saving license data:', error);
    }
};

/**
 * Kaydedilmiş lisans verilerini al
 * @returns {Object|null} - Lisans verileri
 */
export const getSavedLicenseData = () => {
    try {
        const savedData = localStorage.getItem('jetArayanLicense');
        return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
        console.error('Error getting saved license data:', error);
        return null;
    }
};

/**
 * Hata mesajlarını Türkçe'ye çevir
 * @param {string} errorCode - Hata kodu
 * @returns {string} - Türkçe hata mesajı
 */
export const getErrorMessage = (errorCode) => {
    const errorMessages = {
        'INVALID_FORMAT': 'Lisans anahtarı 6 harf olmalıdır (A-Z harfleri).',
        'DATABASE_ERROR': 'Veritabanı bağlantısında sorun oluştu. Lütfen tekrar deneyin.',
        'KEY_NOT_FOUND': 'Bu lisans anahtarı sistemde bulunamadı.',
        'LICENSE_INACTIVE': 'Bu lisans anahtarı aktif değil.',
        'PLAN_EXPIRED': 'Lisans süreniz dolmuş.',
        'UNEXPECTED_ERROR': 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
    };
    
    return errorMessages[errorCode] || 'Bilinmeyen bir hata oluştu.';
};