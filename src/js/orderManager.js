// JetArayan - Sipariş Yönetimi Firebase Entegrasyonu
// Bu modül müşteri siparişlerini Firebase Firestore'da yönetir

import { addDocument, getDocuments, updateDocument } from './firebase-firestore.js';

class OrderManager {
    constructor() {
        this.currentLicenseKey = null;
        this.orderStatuses = {
            PREPARING: 'hazırlanıyor',
            IN_TRANSIT: 'kargoda',
            DELIVERED: 'teslim edildi',
            CANCELLED: 'iptal edildi',
            PENDING: 'beklemede'
        };
    }

    // License key'i yükle
    async loadLicenseKey() {
        if (!this.currentLicenseKey) {
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
            } catch (error) {
                console.error('License key yükleme hatası:', error);
                throw error;
            }
        }
        return this.currentLicenseKey;
    }

    // Yeni sipariş oluştur
    async createOrder(customerId, orderData) {
        try {
            await this.loadLicenseKey();

            // Sipariş verilerini doğrula
            if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error('Sipariş ürünleri gereklidir');
            }

            // Toplam tutarı hesapla
            const totalAmount = orderData.items.reduce((total, item) => {
                const quantity = parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unitPrice || item.price) || 0;
                return total + (quantity * unitPrice);
            }, 0);

            const newOrder = {
                customerId: customerId,
                orderNumber: this.generateOrderNumber(),
                items: orderData.items.map(item => ({
                    productName: (item.productName || item.name || '').toString().trim(),
                    quantity: parseFloat(item.quantity),
                    unit: item.unit || 'adet',
                    unitPrice: parseFloat(item.unitPrice || item.price),
                    totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice || item.price),
                    productId: item.productId || null
                })),
                totalAmount: totalAmount,
                orderDate: new Date().toISOString(),
                status: orderData.status || this.orderStatuses.PENDING,
                notes: orderData.notes || '',
                deliveryAddress: orderData.deliveryAddress || '',
                paymentMethod: orderData.paymentMethod || '',
                isActive: true
            };

            const result = await addDocument(
                `keys/${this.currentLicenseKey}/customers/${customerId}/orders`,
                newOrder
            );

            if (result.success) {
                return { success: true, order: { id: result.id, ...newOrder } };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Sipariş oluşturma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Müşterinin sipariş geçmişini getir
    async getCustomerOrders(customerId, options = {}) {
        try {
            await this.loadLicenseKey();

            const queryOptions = {
                orderBy: { field: 'orderDate', direction: 'desc' },
                ...options
            };

            const result = await getDocuments(
                `keys/${this.currentLicenseKey}/customers/${customerId}/orders`,
                queryOptions
            );

            if (result.success) {
                return {
                    success: true,
                    orders: result.data.map(order => ({
                        id: order.id,
                        ...order,
                        formattedDate: this.formatOrderDate(order.orderDate),
                        formattedTotal: this.formatCurrency(order.totalAmount)
                    }))
                };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Sipariş geçmişi alma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Sipariş durumunu güncelle
    async updateOrderStatus(customerId, orderId, newStatus, notes = '') {
        try {
            await this.loadLicenseKey();

            if (!Object.values(this.orderStatuses).includes(newStatus)) {
                throw new Error('Geçersiz sipariş durumu');
            }

            const updateData = {
                status: newStatus,
                statusUpdatedAt: new Date().toISOString()
            };

            if (notes) {
                updateData.statusNotes = notes;
            }

            const result = await updateDocument(
                `keys/${this.currentLicenseKey}/customers/${customerId}/orders`,
                orderId,
                updateData
            );

            return result;
        } catch (error) {
            console.error('Sipariş durumu güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Sipariş detaylarını güncelle
    async updateOrder(customerId, orderId, updateData) {
        try {
            await this.loadLicenseKey();

            // Eğer ürünler güncelleniyorsa toplam tutarı yeniden hesapla
            if (updateData.items) {
                updateData.totalAmount = updateData.items.reduce((total, item) => {
                    return total + (item.quantity * item.unitPrice);
                }, 0);
            }

            const result = await updateDocument(
                `keys/${this.currentLicenseKey}/customers/${customerId}/orders`,
                orderId,
                {
                    ...updateData,
                    lastModified: new Date().toISOString()
                }
            );

            return result;
        } catch (error) {
            console.error('Sipariş güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Sipariş numarası oluştur
    generateOrderNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const time = now.getTime().toString().slice(-6);
        
        return `SP${year}${month}${day}${time}`;
    }

    // Tarih formatla
    formatOrderDate(dateString) {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul'
        };
        return date.toLocaleDateString('tr-TR', options);
    }

    // Para birimi formatla
    formatCurrency(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Sipariş istatistikleri
    async getOrderStatistics(customerId) {
        try {
            const ordersResult = await this.getCustomerOrders(customerId);
            
            if (!ordersResult.success) {
                return ordersResult;
            }

            const orders = ordersResult.orders;
            const stats = {
                totalOrders: orders.length,
                totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
                statusCounts: {},
                averageOrderValue: 0,
                lastOrderDate: orders.length > 0 ? orders[0].orderDate : null
            };

            // Durum sayıları
            Object.values(this.orderStatuses).forEach(status => {
                stats.statusCounts[status] = orders.filter(order => order.status === status).length;
            });

            // Ortalama sipariş değeri
            if (orders.length > 0) {
                stats.averageOrderValue = stats.totalAmount / orders.length;
            }

            return {
                success: true,
                statistics: {
                    ...stats,
                    formattedTotalAmount: this.formatCurrency(stats.totalAmount),
                    formattedAverageOrderValue: this.formatCurrency(stats.averageOrderValue)
                }
            };
        } catch (error) {
            console.error('Sipariş istatistikleri alma hatası:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global instance oluştur
const orderManager = new OrderManager();

// Export et
export default orderManager;
export { OrderManager };