// Dashboard JavaScript - Tauri Uyumlu Modern ve Optimize Edilmiş

class DashboardManager {
    constructor() {
        // Kurulum kontrolü yap ve asenkron başlatma
        this.initialize();
    }
    
    async initialize() {
        try {
            // Kurulum kontrolü kaldırıldı - doğrudan dashboard yüklenecek
            
            this.config = null;
            this.platforms = new Map();
            this.orders = [];
            this.stats = {
                connectedPlatforms: 0,
                totalOrders: 0,
                todayRevenue: 0,
                avgDeliveryTime: 0
            };
            
            this.initializeElements();
            await this.loadAppVersion();
            await this.loadConfiguration(); // Konfigürasyon yüklenmesini bekle
            this.bindEvents();
            this.startDataRefresh();
        } catch (error) {
            console.error('Dashboard başlatma hatası:', error);
            // Hata durumunda varsayılan konfigürasyonla devam et
            this.initializeElements();
            this.loadDefaultConfiguration();
            this.bindEvents();
        }
    }
    

    


    // Uygulama versiyon bilgisini yükle ve DOM'a yaz
    async loadAppVersion() {
        try {
            // Tauri API'sini kullanarak versiyon bilgisini al
            const { invoke } = window.__TAURI__.core;
            const version = await invoke('get_app_version');
            
            // Versiyon bilgisini DOM'a yaz
            const versionElement = document.querySelector('.version');
            if (versionElement) {
                versionElement.textContent = `v${version}`;
                versionElement.style.display = 'inline';
            }
            
            console.log('Uygulama versiyonu yüklendi:', version);
        } catch (error) {
            console.error('Versiyon bilgisi alınamadı:', error);
            // Hata durumunda fallback versiyon göster
            const versionElement = document.querySelector('.version');
            if (versionElement) {
                versionElement.textContent = 'v0.1.0';
                versionElement.style.display = 'inline';
            }
        }
    }

    // Konfigürasyonu yükle - Tauri uyumlu
    async loadConfiguration() {
        try {
            // Tauri'nin store API'sini kullan
            const { Store } = window.__TAURI__.store;
            const store = new Store('.settings.dat');
            
            this.config = await store.get('jetSiparisSetup');
            
            if (this.config && this.config.platforms) {
                this.initializePlatforms();
            } else {
                console.warn('Konfigürasyon bulunamadı, varsayılan ayarlar yükleniyor...');
                this.loadDefaultConfiguration();
            }
        } catch (error) {
            console.error('Konfigürasyon yükleme hatası:', error);
            // Fallback: localStorage kullan
            try {
                const configData = localStorage.getItem('jetSiparisSetup');
                if (configData) {
                    this.config = JSON.parse(configData);
                    this.initializePlatforms();
                } else {
                    this.loadDefaultConfiguration();
                }
            } catch (fallbackError) {
                console.error('Fallback konfigürasyon yükleme hatası:', fallbackError);
                this.loadDefaultConfiguration();
            }
        }
    }

    // Varsayılan konfigürasyon yükle
    loadDefaultConfiguration() {
        this.config = {
            platforms: {
                yemeksepeti: { enabled: true },
                trendyol: { enabled: true },
                getir: { enabled: true },
                migros: { enabled: true }
            },
            apiConfigs: {},
            license: 'demo'
        };
        this.initializePlatforms();
    }

    // DOM elementlerini başlat
    initializeElements() {
        this.userEmailEl = document.getElementById('userEmail');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.platformsGrid = document.getElementById('platformsGrid');
        this.ordersTableBody = document.getElementById('ordersTableBody');
        
        // Stats elements
        this.connectedPlatformsEl = document.getElementById('connectedPlatforms');
        this.totalOrdersEl = document.getElementById('totalOrders');
        this.todayRevenueEl = document.getElementById('todayRevenue');
        this.avgDeliveryTimeEl = document.getElementById('avgDeliveryTime');
        
        // Settings buttons
        this.managePlatformsBtn = document.getElementById('managePlatformsBtn');
        this.apiSettingsBtn = document.getElementById('apiSettingsBtn');
        this.resetBtn = document.getElementById('resetBtn');
    }

    // Event listener'ları bağla
    bindEvents() {
        // Modal events
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeSettingsModal());
        }
        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) {
                    this.closeSettingsModal();
                }
            });
        }

        // Refresh button
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Settings options
        if (this.managePlatformsBtn) {
            this.managePlatformsBtn.addEventListener('click', () => this.managePlatforms());
        }
        if (this.apiSettingsBtn) {
            this.apiSettingsBtn.addEventListener('click', () => this.openAPISettings());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetConfiguration());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    // Platformları başlat
    initializePlatforms() {
        const platformConfigs = {
            yemeksepeti: {
                name: 'YemekSepeti',
                icon: 'fas fa-utensils',
                color: '#ff6b35',
                logo: 'https://jetsiparis.solosolf.com/img/Yemek-Sepeti.png'
            },
            trendyol: {
                name: 'Trendyol Yemek',
                icon: 'fas fa-shopping-bag',
                color: '#f27a1a',
                logo: 'https://jetsiparis.solosolf.com/img/trendyol-yemek.webp'
            },
            getir: {
                name: 'Getir Yemek',
                icon: 'fas fa-motorcycle',
                color: '#5d3ebc',
                logo: 'https://jetsiparis.solosolf.com/img/getir-yemek.png'
            },
            migros: {
                name: 'Migros Yemek',
                icon: 'fas fa-leaf',
                color: '#00a650',
                logo: 'https://jetsiparis.solosolf.com/img/migros-yemek.webp'
            }
        };

        if (this.config && this.config.platforms) {
            Object.keys(this.config.platforms).forEach(platformKey => {
                const platformConfig = platformConfigs[platformKey];
                if (platformConfig && this.config.platforms[platformKey].enabled) {
                    this.platforms.set(platformKey, {
                        ...platformConfig,
                        connected: true,
                        orders: this.generateMockOrders(platformKey),
                        revenue: this.generateMockRevenue(),
                        avgDeliveryTime: this.generateMockDeliveryTime()
                    });
                }
            });
        }

        this.updateStats();
        this.renderPlatforms();
        this.renderOrders();
    }

    // Mock veri oluşturma fonksiyonları
    generateMockOrders(platform) {
        return Math.floor(Math.random() * 50) + 10;
    }

    generateMockRevenue() {
        return Math.floor(Math.random() * 5000) + 1000;
    }

    generateMockDeliveryTime() {
        return Math.floor(Math.random() * 20) + 25;
    }

    // İstatistikleri güncelle
    updateStats() {
        this.stats.connectedPlatforms = this.platforms.size;
        this.stats.totalOrders = Array.from(this.platforms.values())
            .reduce((total, platform) => total + platform.orders, 0);
        this.stats.todayRevenue = Array.from(this.platforms.values())
            .reduce((total, platform) => total + platform.revenue, 0);
        this.stats.avgDeliveryTime = this.platforms.size > 0 ? Math.round(
            Array.from(this.platforms.values())
                .reduce((total, platform) => total + platform.avgDeliveryTime, 0) / this.platforms.size
        ) : 0;

        // DOM'u güncelle
        if (this.connectedPlatformsEl) {
            this.connectedPlatformsEl.textContent = this.stats.connectedPlatforms;
        }
        if (this.totalOrdersEl) {
            this.totalOrdersEl.textContent = this.stats.totalOrders;
        }
        if (this.todayRevenueEl) {
            this.todayRevenueEl.textContent = `₺${this.stats.todayRevenue.toLocaleString()}`;
        }
        if (this.avgDeliveryTimeEl) {
            this.avgDeliveryTimeEl.textContent = `${this.stats.avgDeliveryTime} dk`;
        }
    }

    // Platformları render et
    renderPlatforms() {
        if (!this.platformsGrid) {
            console.error('platformsGrid elementi bulunamadı!');
            return;
        }
        
        this.platformsGrid.innerHTML = '';
        
        if (this.platforms.size === 0) {
            console.warn('Hiç platform bulunamadı, varsayılan platformlar yükleniyor...');
            this.loadDefaultConfiguration();
            return;
        }
        
        this.platforms.forEach((platform, key) => {
            const platformCard = this.createPlatformCard(key, platform);
            this.platformsGrid.appendChild(platformCard);
        });
    }

    // Platform kartı oluştur
    createPlatformCard(key, platform) {
        const card = document.createElement('div');
        card.className = 'platform-card';
        
        // Logo varsa logo kullan, yoksa icon kullan
        const logoOrIcon = platform.logo 
            ? `<img src="${platform.logo}" alt="${platform.name}" class="platform-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"><i class="${platform.icon}" style="display: none;"></i>`
            : `<div class="platform-icon" style="background: ${platform.color}"><i class="${platform.icon}"></i></div>`;
        
        card.innerHTML = `
            <div class="platform-header">
                <div class="platform-info">
                    ${logoOrIcon}
                    <div class="platform-name">${platform.name}</div>
                </div>
                <div class="status-badge ${platform.connected ? 'connected' : 'disconnected'}">
                    ${platform.connected ? 'Bağlı' : 'Bağlı Değil'}
                </div>
            </div>
            <div class="platform-stats">
                <div class="platform-stat">
                    <span class="value">${platform.orders}</span>
                    <span class="label">Sipariş</span>
                </div>
                <div class="platform-stat">
                    <span class="value">₺${platform.revenue.toLocaleString()}</span>
                    <span class="label">Gelir</span>
                </div>
            </div>
        `;
        return card;
    }

    // Siparişleri render et
    renderOrders() {
        if (!this.ordersTableBody) return;
        
        this.ordersTableBody.innerHTML = '';
        
        // Mock sipariş verileri oluştur
        const mockOrders = this.generateMockOrdersData();
        
        mockOrders.forEach(order => {
            const row = this.createOrderRow(order);
            this.ordersTableBody.appendChild(row);
        });
    }

    // Mock sipariş verileri oluştur
    generateMockOrdersData() {
        const orders = [];
        const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
        const statusLabels = {
            pending: 'Bekliyor',
            confirmed: 'Onaylandı',
            preparing: 'Hazırlanıyor',
            ready: 'Hazır',
            delivered: 'Teslim Edildi'
        };
        
        const platformKeys = Array.from(this.platforms.keys());
        
        for (let i = 0; i < 10; i++) {
            if (platformKeys.length === 0) break;
            
            const platformKey = platformKeys[Math.floor(Math.random() * platformKeys.length)];
            const platform = this.platforms.get(platformKey);
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            orders.push({
                id: `#${1000 + i}`,
                platform: platform.name,
                customer: `Müşteri ${i + 1}`,
                amount: Math.floor(Math.random() * 200) + 50,
                status: status,
                statusLabel: statusLabels[status],
                time: this.generateRandomTime()
            });
        }
        
        return orders.sort((a, b) => new Date(b.time) - new Date(a.time));
    }

    // Rastgele zaman oluştur
    generateRandomTime() {
        const now = new Date();
        const hoursAgo = Math.floor(Math.random() * 24);
        const minutesAgo = Math.floor(Math.random() * 60);
        return new Date(now.getTime() - (hoursAgo * 60 + minutesAgo) * 60 * 1000);
    }

    // Sipariş satırı oluştur
    createOrderRow(order) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.platform}</td>
            <td>${order.customer}</td>
            <td>₺${order.amount}</td>
            <td><span class="order-status ${order.status}">${order.statusLabel}</span></td>
            <td>${this.formatTime(order.time)}</td>
        `;
        return row;
    }

    // Zamanı formatla
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours} saat önce`;
        } else if (minutes > 0) {
            return `${minutes} dakika önce`;
        } else {
            return 'Az önce';
        }
    }

    // Verileri yenile
    async refreshData() {
        if (this.refreshBtn) {
            this.refreshBtn.classList.add('loading');
            const icon = this.refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('spinner');
            }
        }
        
        // Simüle edilmiş veri yenileme
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Platformları güncelle
        this.platforms.forEach((platform, key) => {
            platform.orders = this.generateMockOrders(key);
            platform.revenue = this.generateMockRevenue();
            platform.avgDeliveryTime = this.generateMockDeliveryTime();
        });
        
        this.updateStats();
        this.renderPlatforms();
        this.renderOrders();
        
        if (this.refreshBtn) {
            this.refreshBtn.classList.remove('loading');
            const icon = this.refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('spinner');
            }
        }
    }

    // Otomatik veri yenileme başlat
    startDataRefresh() {
        // Her 30 saniyede bir verileri yenile
        setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    // Ayarlar modalını aç
    openSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Ayarlar modalını kapat
    closeSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    // Platform yönetimi
    managePlatforms() {
        this.closeSettingsModal();
        // Tauri uyumlu dialog kullan
        this.showTauriDialog('Platform yönetimi özelliği yakında eklenecek!', 'info');
    }

    // API ayarları
    openAPISettings() {
        this.closeSettingsModal();
        // Tauri uyumlu dialog kullan
        this.showTauriDialog('API ayarları özelliği yakında eklenecek!', 'info');
    }

    // Tauri uyumlu dialog göster
    async showTauriDialog(message, type = 'info') {
        try {
            const { message: tauriMessage } = window.__TAURI__.dialog;
            await tauriMessage(message, { title: 'JetSiparış', type });
        } catch (error) {
            console.error('Tauri dialog hatası:', error);
            // Fallback: normal alert
            alert(message);
        }
    }

    // Tauri uyumlu confirm dialog
    async showTauriConfirm(message, title = 'JetSiparış') {
        try {
            const { ask } = window.__TAURI__.dialog;
            return await ask(message, { title, type: 'warning' });
        } catch (error) {
            console.error('Tauri confirm hatası:', error);
            // Fallback: normal confirm
            return confirm(message);
        }
    }

    // Konfigürasyonu sıfırla - Tauri uyumlu
    async resetConfiguration() {
        const confirmed = await this.showTauriConfirm(
            'Bu işlem tüm ayarlarınızı siler ve sizi kurulum sihirbazına yönlendirir. Devam etmek istediğinizden emin misiniz?'
        );
        
        if (confirmed) {
            try {
                // Tauri store'u temizle
                const { Store } = window.__TAURI__.store;
                const store = new Store('.settings.dat');
                await store.clear();
                await store.save();
            } catch (error) {
                console.error('Tauri store temizleme hatası:', error);
            }
            
            // localStorage'ı temizle
            localStorage.removeItem('jetSiparisConfig');
            localStorage.removeItem('jetSiparisSetup');
            localStorage.removeItem('jetSiparisSetupComplete');
            
            console.log('Konfigürasyon sıfırlandı, onboarding sayfasına yönlendiriliyor...');
            
            // Kurulum sihirbazına yönlendir
            window.location.href = './onboarding/index.html';
        }
    }

    // Klavye kısayolları
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + R: Verileri yenile
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.refreshData();
        }
        
        // Escape: Modal'ı kapat
        if (e.key === 'Escape') {
            this.closeSettingsModal();
        }
        
        // Ctrl/Cmd + ,: Ayarları aç
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            this.openSettingsModal();
        }
    }
}

// Sayfa yüklendiğinde dashboard'u başlat
document.addEventListener('DOMContentLoaded', async () => {
    // Tauri API'sinin yüklenmesini bekle
    if (window.__TAURI__) {
        const dashboard = new DashboardManager();
        await dashboard.initialize();
    } else {
        // Tauri API yüklenmemişse kısa bir süre bekle
        setTimeout(async () => {
            const dashboard = new DashboardManager();
            await dashboard.initialize();
        }, 100);
    }
});

// Tauri ortamında Service Worker gereksiz, bu yüzden kaldırıldı
// Tauri kendi offline özelliklerini sağlar