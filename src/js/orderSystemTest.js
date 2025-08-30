/**
 * Sipariş Sistemi Test Dosyası
 * Bu dosya sipariş kaydetme işlemlerini test eder
 */

class OrderSystemTest {
    constructor() {
        this.testResults = [];
    }

    // Test müşterisi oluştur
    async createTestCustomer() {
        const testCustomerData = {
            phone: '05551234567',
            firstName: 'Test',
            lastName: 'Müşteri',
            address: 'Test Mahallesi, Test Sokak No:1, Test İlçe, Test İl',
            addressDetails: {
                district: 'Test İlçe',
                neighborhood: 'Test Mahallesi',
                street: 'Test Sokak',
                buildingNumber: '1'
            },
            note: 'Test müşterisi'
        };

        try {
            const result = await customerManager.saveNewCustomer(testCustomerData);
            this.logResult('Müşteri Oluşturma', result.success, result.error || 'Başarılı');
            return result;
        } catch (error) {
            this.logResult('Müşteri Oluşturma', false, error.message);
            return { success: false, error: error.message };
        }
    }

    // Test siparişi oluştur
    async createTestOrder(customerId) {
        const testOrderData = {
            items: [
                { name: 'Test Ürün 1', price: 25, quantity: 2 },
                { name: 'Test Ürün 2', price: 15, quantity: 1 }
            ],
            total: 65,
            phone: '05551234567',
            status: 'pending',
            notes: 'Test siparişi'
        };

        try {
            const result = await customerManager.addCustomerOrder(customerId, testOrderData);
            this.logResult('Sipariş Oluşturma', result.success, result.error || 'Başarılı');
            return result;
        } catch (error) {
            this.logResult('Sipariş Oluşturma', false, error.message);
            return { success: false, error: error.message };
        }
    }

    // Müşteri sipariş geçmişini kontrol et
    async checkOrderHistory(customerId) {
        try {
            const result = await customerManager.getCustomerOrderHistory(customerId);
            this.logResult('Sipariş Geçmişi Sorgulama', result.success, result.error || `${result.orders?.length || 0} sipariş bulundu`);
            return result;
        } catch (error) {
            this.logResult('Sipariş Geçmişi Sorgulama', false, error.message);
            return { success: false, error: error.message };
        }
    }

    // Müşteri telefon sorgulama testi
    async testPhoneQuery(phone) {
        try {
            const result = await customerManager.queryCustomerByPhone(phone);
            this.logResult('Telefon Sorgulama', result.found, result.error || 'Müşteri bulundu');
            return result;
        } catch (error) {
            this.logResult('Telefon Sorgulama', false, error.message);
            return { found: false, error: error.message };
        }
    }

    // Test sonucunu logla
    logResult(testName, success, message) {
        const result = {
            test: testName,
            success: success,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const status = success ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    // Tüm testleri çalıştır
    async runAllTests() {
        console.log('🚀 Sipariş Sistemi Testleri Başlatılıyor...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Test müşterisi oluştur
            const customerResult = await this.createTestCustomer();
            
            if (customerResult.success) {
                const customerId = customerResult.customer.id;
                
                // 2. Test siparişi oluştur
                const orderResult = await this.createTestOrder(customerId);
                
                // 3. Sipariş geçmişini kontrol et
                await this.checkOrderHistory(customerId);
                
                // 4. Telefon sorgulama testi
                await this.testPhoneQuery('05551234567');
            }
            
        } catch (error) {
            console.error('Test çalıştırma hatası:', error);
        }
        
        // Test sonuçlarını özetle
        this.summarizeResults();
    }

    // Test sonuçlarını özetle
    summarizeResults() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 TEST SONUÇLARI');
        console.log('=' .repeat(50));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Toplam Test: ${totalTests}`);
        console.log(`Başarılı: ${passedTests} ✅`);
        console.log(`Başarısız: ${failedTests} ❌`);
        console.log(`Başarı Oranı: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Başarısız Testler:');
            this.testResults
                .filter(r => !r.success)
                .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
        }
        
        console.log('\n🎯 Test tamamlandı!');
    }

    // Test sonuçlarını temizle
    clearResults() {
        this.testResults = [];
    }
}

// Global test instance
window.orderSystemTest = new OrderSystemTest();

// Test çalıştırma fonksiyonu
window.runOrderSystemTest = () => {
    if (typeof customerManager === 'undefined') {
        console.error('❌ customerManager bulunamadı. Lütfen önce customerManager.js dosyasını yükleyin.');
        return;
    }
    
    window.orderSystemTest.runAllTests();
};

console.log('📋 Sipariş Sistemi Test Modülü yüklendi.');
console.log('🔧 Test çalıştırmak için: runOrderSystemTest()');