// JetArayan - Sipariş Test Verileri
// Bu dosya sipariş sistemini test etmek için örnek veriler içerir

import customerManager from './customerManager.js';
import orderManager from './orderManager.js';

// Örnek sipariş verileri
const sampleOrders = [
    {
        items: [
            {
                productName: "Domates (Salçalık)",
                quantity: 5,
                unit: "kg",
                unitPrice: 12.50,
                productId: "tomato_001"
            },
            {
                productName: "Soğan (Sarı)",
                quantity: 3,
                unit: "kg",
                unitPrice: 8.00,
                productId: "onion_001"
            }
        ],
        status: "hazırlanıyor",
        notes: "Taze ürünler tercih edilsin",
        deliveryAddress: "Merkez Mahallesi, Atatürk Caddesi No:15",
        paymentMethod: "Kapıda Ödeme"
    },
    {
        items: [
            {
                productName: "Elma (Starking)",
                quantity: 2,
                unit: "kg",
                unitPrice: 15.00,
                productId: "apple_001"
            },
            {
                productName: "Muz (Ekvador)",
                quantity: 1,
                unit: "kg",
                unitPrice: 18.00,
                productId: "banana_001"
            },
            {
                productName: "Portakal (Valencia)",
                quantity: 3,
                unit: "kg",
                unitPrice: 10.00,
                productId: "orange_001"
            }
        ],
        status: "kargoda",
        notes: "Meyvelerin olgunluk durumuna dikkat edilsin",
        deliveryAddress: "Yeni Mahalle, Cumhuriyet Sokak No:8",
        paymentMethod: "Kredi Kartı"
    },
    {
        items: [
            {
                productName: "Süt (Tam Yağlı)",
                quantity: 4,
                unit: "litre",
                unitPrice: 6.50,
                productId: "milk_001"
            },
            {
                productName: "Ekmek (Tam Buğday)",
                quantity: 2,
                unit: "adet",
                unitPrice: 4.00,
                productId: "bread_001"
            },
            {
                productName: "Yumurta (Organik)",
                quantity: 1,
                unit: "düzine",
                unitPrice: 25.00,
                productId: "egg_001"
            }
        ],
        status: "teslim edildi",
        notes: "Son kullanma tarihlerine dikkat edilsin",
        deliveryAddress: "Çamlık Mahallesi, Barış Caddesi No:22",
        paymentMethod: "Nakit"
    }
];

// Test fonksiyonları
class OrderTestManager {
    constructor() {
        this.testResults = [];
    }

    // Müşteriye örnek siparişler ekle
    async addSampleOrdersToCustomer(customerId) {
        try {
            console.log(`Müşteri ${customerId} için örnek siparişler ekleniyor...`);
            
            const results = [];
            
            for (let i = 0; i < sampleOrders.length; i++) {
                const orderData = sampleOrders[i];
                
                // Her sipariş için farklı tarih oluştur (geçmişten bugüne)
                const orderDate = new Date();
                orderDate.setDate(orderDate.getDate() - (sampleOrders.length - i) * 7); // Her sipariş 1 hafta arayla
                
                const orderWithDate = {
                    ...orderData,
                    orderDate: orderDate.toISOString()
                };
                
                const result = await customerManager.addCustomerOrder(customerId, orderWithDate);
                results.push(result);
                
                if (result.success) {
                    console.log(`✓ Sipariş ${i + 1} başarıyla eklendi: ${result.order.orderNumber}`);
                } else {
                    console.error(`✗ Sipariş ${i + 1} eklenemedi:`, result.error);
                }
                
                // API limitlerini aşmamak için kısa bekleme
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            return {
                success: true,
                addedOrders: results.filter(r => r.success).length,
                totalOrders: sampleOrders.length,
                results: results
            };
        } catch (error) {
            console.error('Örnek sipariş ekleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Müşteri sipariş geçmişini test et
    async testCustomerOrderHistory(customerId) {
        try {
            console.log(`Müşteri ${customerId} sipariş geçmişi test ediliyor...`);
            
            const result = await customerManager.getCustomerOrderHistory(customerId);
            
            if (result.success) {
                console.log(`✓ ${result.orders.length} sipariş bulundu`);
                
                result.orders.forEach((order, index) => {
                    console.log(`  ${index + 1}. ${order.orderNumber} - ${order.status} - ${order.formattedTotal}`);
                });
                
                return result;
            } else {
                console.error('✗ Sipariş geçmişi alınamadı:', result.error);
                return result;
            }
        } catch (error) {
            console.error('Sipariş geçmişi test hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Müşteri sipariş istatistiklerini test et
    async testCustomerOrderStatistics(customerId) {
        try {
            console.log(`Müşteri ${customerId} sipariş istatistikleri test ediliyor...`);
            
            const result = await customerManager.getCustomerOrderStatistics(customerId);
            
            if (result.success) {
                const stats = result.statistics;
                console.log(`✓ İstatistikler:`);
                console.log(`  - Toplam Sipariş: ${stats.totalOrders}`);
                console.log(`  - Toplam Tutar: ${stats.formattedTotalAmount}`);
                console.log(`  - Ortalama Sipariş Değeri: ${stats.formattedAverageOrderValue}`);
                console.log(`  - Durum Dağılımı:`, stats.statusCounts);
                
                return result;
            } else {
                console.error('✗ İstatistikler alınamadı:', result.error);
                return result;
            }
        } catch (error) {
            console.error('İstatistik test hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Sipariş durumu güncelleme testi
    async testOrderStatusUpdate(customerId, orderId, newStatus) {
        try {
            console.log(`Sipariş ${orderId} durumu '${newStatus}' olarak güncelleniyor...`);
            
            const result = await customerManager.updateCustomerOrderStatus(
                customerId, 
                orderId, 
                newStatus, 
                `Test güncellemesi - ${new Date().toLocaleString('tr-TR')}`
            );
            
            if (result.success) {
                console.log(`✓ Sipariş durumu başarıyla güncellendi`);
            } else {
                console.error(`✗ Sipariş durumu güncellenemedi:`, result.error);
            }
            
            return result;
        } catch (error) {
            console.error('Sipariş durumu güncelleme test hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Tam test senaryosu
    async runFullTest(customerId) {
        try {
            console.log('=== SİPARİŞ YÖNETİMİ TAM TEST BAŞLADI ===');
            
            // 1. Örnek siparişler ekle
            const addResult = await this.addSampleOrdersToCustomer(customerId);
            this.testResults.push({ test: 'Sipariş Ekleme', result: addResult });
            
            // 2. Sipariş geçmişini kontrol et
            const historyResult = await this.testCustomerOrderHistory(customerId);
            this.testResults.push({ test: 'Sipariş Geçmişi', result: historyResult });
            
            // 3. İstatistikleri kontrol et
            const statsResult = await this.testCustomerOrderStatistics(customerId);
            this.testResults.push({ test: 'Sipariş İstatistikleri', result: statsResult });
            
            // 4. Eğer siparişler varsa, birinin durumunu güncelle
            if (historyResult.success && historyResult.orders.length > 0) {
                const firstOrder = historyResult.orders[0];
                const updateResult = await this.testOrderStatusUpdate(
                    customerId, 
                    firstOrder.id, 
                    'teslim edildi'
                );
                this.testResults.push({ test: 'Sipariş Durumu Güncelleme', result: updateResult });
            }
            
            console.log('=== SİPARİŞ YÖNETİMİ TAM TEST TAMAMLANDI ===');
            
            return {
                success: true,
                testResults: this.testResults
            };
        } catch (error) {
            console.error('Tam test hatası:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global instance oluştur
const orderTestManager = new OrderTestManager();

// Export et
export default orderTestManager;
export { OrderTestManager, sampleOrders };