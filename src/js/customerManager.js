// JetArayan - Müşteri Yönetimi Firebase Entegrasyonu
// Bu modül müşteri verilerini Firebase Firestore'da yönetir

import { addDocument, getDocuments, updateDocument } from './firebase-firestore.js';
import orderManager from './orderManager.js';

class CustomerManager {
    constructor() {
        this.currentLicenseKey = null;
        this.customers = [];
        this.currentCustomer = null;
        this.newCustomerPhone = null;
    }

    // License key'i yükle veya oluştur
    async loadLicenseKey() {
        try {
            const result = await getDocuments('keys', {
                orderBy: { field: 'createdAt', direction: 'desc' },
                limit: 1
            });

            if (result.success && result.data.length > 0) {
                this.currentLicenseKey = result.data[0].id;
            } else {
                const newKey = await addDocument('keys', {
                    name: 'Default License',
                    createdAt: new Date().toISOString(),
                    isActive: true
                });
                if (!newKey.success) throw new Error('License key oluşturulamadı');
                this.currentLicenseKey = newKey.id;
            }
            return this.currentLicenseKey;
        } catch (error) {
            console.error('License key yükleme hatası:', error);
            throw error;
        }
    }

    // Telefon numarasına göre müşteri sorgula
    async queryCustomerByPhone(phone) {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            // Telefon numarasını temizle (sadece rakamlar)
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            
            const result = await getDocuments(`keys/${this.currentLicenseKey}/customers`, {
                where: [{
                    field: 'phone',
                    operator: '==',
                    value: cleanPhone
                }],
                limit: 1
            });

            if (result.success && result.data.length > 0) {
                const customer = result.data[0];
                // Arama sayısını artır
                await this.incrementCallCount(customer.id);
                
                // Sipariş alt koleksiyonunu başlat
                const orderCollectionResult = await this.initializeCustomerOrderCollection(customer.id);
                
                return { 
                    found: true, 
                    customer: customer,
                    orderCollection: orderCollectionResult
                };
            } else {
                return { found: false, phone: cleanPhone };
            }
        } catch (error) {
            console.error('Müşteri sorgulama hatası:', error);
            return { found: false, error: error.message };
        }
    }

    // Yeni müşteri kaydet
    async saveNewCustomer(customerData) {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            // Telefon numarasını temizle
            const cleanPhone = customerData.phone.replace(/[^0-9]/g, '');
            
            const newCustomer = {
                phone: cleanPhone,
                firstName: (customerData.firstName || '').toString().trim(),
                lastName: (customerData.lastName || '').toString().trim(),
                address: customerData.address || '',
                addressDetails: customerData.addressDetails || {},
                note: customerData.note || '',
                callCount: 1,
                isActive: true
            };

            const result = await addDocument(`keys/${this.currentLicenseKey}/customers`, newCustomer);
            
            if (result.success) {
                const customerId = result.id;
                const customerWithId = { id: customerId, ...newCustomer };
                
                // Yeni müşteri için sipariş alt koleksiyonunu başlat
                const orderCollectionResult = await this.initializeCustomerOrderCollection(customerId);
                
                return { 
                    success: true, 
                    customer: customerWithId,
                    orderCollection: orderCollectionResult
                };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Müşteri kaydetme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Müşteri bilgilerini güncelle
    async updateCustomer(customerId, updateData) {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            const result = await updateDocument(
                `keys/${this.currentLicenseKey}/customers`,
                customerId,
                {
                    firstName: (updateData.firstName || '').toString().trim(),
                    lastName: (updateData.lastName || '').toString().trim(),
                    address: updateData.address || '',
                    addressDetails: updateData.addressDetails || {},
                    note: updateData.note || ''
                }
            );

            return result;
        } catch (error) {
            console.error('Müşteri güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Arama sayısını artır
    async incrementCallCount(customerId) {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            // Önce mevcut müşteriyi al
            const customerResult = await getDocuments(`keys/${this.currentLicenseKey}/customers`, {
                where: [{
                    field: '__name__',
                    operator: '==',
                    value: customerId
                }],
                limit: 1
            });

            if (customerResult.success && customerResult.data.length > 0) {
                const customer = customerResult.data[0];
                const newCallCount = (customer.callCount || 0) + 1;
                
                await updateDocument(
                    `keys/${this.currentLicenseKey}/customers`,
                    customerId,
                    { callCount: newCallCount }
                );
            }
        } catch (error) {
            console.error('Arama sayısı güncelleme hatası:', error);
        }
    }

    // Müşteri sipariş geçmişini getir
    async getCustomerOrderHistory(customerId) {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            const result = await orderManager.getCustomerOrders(customerId);
            return result;
        } catch (error) {
            console.error('Sipariş geçmişi alma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Müşteriye yeni sipariş ekle
    async addCustomerOrder(customerId, orderData) {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            const result = await orderManager.createOrder(customerId, orderData);
            return result;
        } catch (error) {
            console.error('Sipariş ekleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Müşteri sipariş istatistiklerini getir
    async getCustomerOrderStatistics(customerId) {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            const result = await orderManager.getOrderStatistics(customerId);
            return result;
        } catch (error) {
            console.error('Sipariş istatistikleri alma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Sipariş durumunu güncelle
    async updateCustomerOrderStatus(customerId, orderId, newStatus, notes = '') {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            const result = await orderManager.updateOrderStatus(customerId, orderId, newStatus, notes);
            return result;
        } catch (error) {
            console.error('Sipariş durumu güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Müşteri arama yapıldığında sipariş alt koleksiyonunu başlat
    async initializeCustomerOrderCollection(customerId) {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            // Müşterinin mevcut siparişlerini kontrol et
            const ordersResult = await this.getCustomerOrderHistory(customerId);
            
            if (ordersResult.success) {
                console.log(`Müşteri ${customerId} için ${ordersResult.orders.length} sipariş bulundu.`);
                return {
                    success: true,
                    orderCount: ordersResult.orders.length,
                    orders: ordersResult.orders
                };
            } else {
                // Alt koleksiyon henüz yoksa, boş bir yapı oluştur
                console.log(`Müşteri ${customerId} için sipariş alt koleksiyonu başlatıldı.`);
                return {
                    success: true,
                    orderCount: 0,
                    orders: [],
                    message: 'Sipariş alt koleksiyonu hazır'
                };
            }
        } catch (error) {
            console.error('Sipariş alt koleksiyonu başlatma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Tüm müşterileri getir (isteğe bağlı)
    async getAllCustomers() {
        try {
            if (!this.currentLicenseKey) {
                await this.loadLicenseKey();
            }

            const result = await getDocuments(`keys/${this.currentLicenseKey}/customers`, {
                orderBy: { field: 'createdAt', direction: 'desc' }
            });

            return result;
        } catch (error) {
            console.error('Müşteri listesi alma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Telefon numarasını formatla
    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.length === 11 && cleaned.startsWith('0')) {
            // 0XXX XXX XX XX formatı
            return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
        } else if (cleaned.length === 10) {
            // XXX XXX XX XX formatı
            return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
        }
        return phone; // Formatlanamadıysa orijinal halini döndür
    }

    // Adres bilgilerini formatla
    formatAddress(addressDetails) {
        if (!addressDetails) return '';
        
        const parts = [];
        if (addressDetails.street) parts.push(addressDetails.street);
        if (addressDetails.buildingName) parts.push(addressDetails.buildingName);
        if (addressDetails.buildingNumber) parts.push(`No: ${addressDetails.buildingNumber}`);
        if (addressDetails.apartment) parts.push(`Daire: ${addressDetails.apartment}`);
        if (addressDetails.floor) parts.push(`Kat: ${addressDetails.floor}`);
        if (addressDetails.neighborhood) parts.push(addressDetails.neighborhood);
        if (addressDetails.district) parts.push(addressDetails.district);
        if (addressDetails.city) parts.push(addressDetails.city);
        
        return parts.join(', ');
    }
}

// Global instance oluştur
const customerManager = new CustomerManager();

// Export et
export default customerManager;
export { CustomerManager };