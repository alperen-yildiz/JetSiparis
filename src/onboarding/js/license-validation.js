// JetArayan Lisans Doğrulama Sistemi
import { getDocuments } from '../../js/firebase-firestore.js';

/**
 * Lisans anahtarını doğrular
 * @param {string} licenseKey - Doğrulanacak lisans anahtarı
 * @returns {Promise<Object>} - Doğrulama sonucu
 */
export const validateLicenseKey = async (licenseKey) => {
    try {
        // Lisans anahtarını temizle ve formatla (TCNOWL formatı)
        const cleanKey = licenseKey.replace(/[^A-Z]/g, '').toUpperCase();
        
        if (cleanKey.length !== 6) {
            return {
                success: false,
                error: 'Geçersiz lisans anahtarı formatı (TCNOWL bekleniyor)',
                code: 'INVALID_FORMAT'
            };
        }
        
        // TCNOWL formatı kontrolü
        if (!validateTCNOWLFormat(cleanKey)) {
            return {
                success: false,
                error: 'Lisans anahtarı TCNOWL formatında olmalıdır',
                code: 'INVALID_TCNOWL_FORMAT'
            };
        }

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

/**
 * TCNOWL formatını doğrular
 * @param {string} key - 6 karakterlik lisans anahtarı
 * @returns {boolean} - Format geçerliliği
 */
function validateTCNOWLFormat(key) {
    // TCNOWL formatı: T-C-N-O-W-L harflerinin sırasını kontrol et
    const expectedPattern = /^[A-Z]{6}$/;
    
    if (!expectedPattern.test(key)) {
        return false;
    }
    
    // TCNOWL harflerinin varlığını kontrol et (sıra önemli değil)
    const requiredLetters = ['T', 'C', 'N', 'O', 'W', 'L'];
    const keyLetters = key.split('');
    
    // Her harfin bir kez kullanılması gerekiyor
    for (let letter of requiredLetters) {
        if (!keyLetters.includes(letter)) {
            return false;
        }
    }
    
    // Tekrar eden harf olmamalı
    const uniqueLetters = [...new Set(keyLetters)];
    if (uniqueLetters.length !== 6) {
        return false;
    }
    
    return true;
}

/**
 * Plan türünü ve geçerliliğini belirler
 * @param {string|Date} subValue - Abonelik değeri
 * @returns {Object} - Plan bilgileri
 */
function determinePlanType(subValue) {
    // Sınırsız plan kontrolü
    if (subValue === 'noLimit') {
        return {
            valid: true,
            type: 'unlimited',
            expiryDate: null
        };
    }

    // Yıllık plan kontrolü
    try {
        const expiryDate = new Date(subValue);
        const currentDate = new Date();

        if (expiryDate > currentDate) {
            return {
                valid: true,
                type: 'yearly',
                expiryDate: expiryDate
            };
        } else {
            return {
                valid: false,
                error: 'Lisans süresi dolmuş',
                type: 'expired'
            };
        }
    } catch (error) {
        return {
            valid: false,
            error: 'Geçersiz abonelik bilgisi',
            type: 'invalid'
        };
    }
}

/**
 * Lisans bilgilerini localStorage'a kaydet
 * @param {Object} licenseData - Lisans verileri
 */
export const saveLicenseData = (licenseData) => {
    const licenseInfo = {
        ...licenseData,
        validatedAt: new Date().toISOString(),
        version: '1.0.0'
    };
    
    localStorage.setItem('jetArayanLicense', JSON.stringify(licenseInfo));
};

/**
 * Kaydedilmiş lisans bilgilerini al
 * @returns {Object|null} - Lisans bilgileri
 */
export const getSavedLicenseData = () => {
    try {
        const savedData = localStorage.getItem('jetArayanLicense');
        return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
        console.error('Lisans bilgileri alınamadı:', error);
        return null;
    }
};

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
 * Hata mesajlarını Türkçe'ye çevir
 * @param {string} errorCode - Hata kodu
 * @returns {string} - Türkçe hata mesajı
 */
export const getErrorMessage = (errorCode) => {
    const errorMessages = {
        'INVALID_FORMAT': 'Lisans anahtarı 6 harf olmalıdır (TCNOWL formatı).',
        'INVALID_TCNOWL_FORMAT': 'Lisans anahtarı T, C, N, O, W, L harflerini içermelidir.',
        'DATABASE_ERROR': 'Veritabanı bağlantısında sorun oluştu. Lütfen tekrar deneyin.',
        'KEY_NOT_FOUND': 'Bu lisans anahtarı sistemde bulunamadı.',
        'LICENSE_INACTIVE': 'Bu lisans anahtarı aktif değil.',
        'PLAN_EXPIRED': 'Lisans süreniz dolmuş.',
        'UNEXPECTED_ERROR': 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
    };
    
    return errorMessages[errorCode] || 'Bilinmeyen bir hata oluştu.';
};