/**
 * COM Port Yönetimi
 * Tauri backend ile COM portlarını listeler ve yönetir
 */

class ComPortManager {
    constructor() {
        this.comPortSelect = null;
        this.refreshPortsBtn = null;
        this.selectedPort = null;
        this.init();
    }

    /**
     * COM Port Manager'ı başlatır
     */
    init() {
        // DOM elementlerini al
        this.comPortSelect = document.getElementById('comPortSelect');
        this.refreshPortsBtn = document.getElementById('refreshPortsBtn');

        if (!this.comPortSelect || !this.refreshPortsBtn) {
            console.error('COM Port elementleri bulunamadı!');
            return;
        }

        // Event listener'ları ekle
        this.setupEventListeners();
        
        // Sayfa yüklendiğinde portları listele
        this.loadComPorts();
    }

    /**
     * Event listener'ları ayarlar
     */
    setupEventListeners() {
        // Port seçimi değiştiğinde
        this.comPortSelect.addEventListener('change', (e) => {
            this.selectedPort = e.target.value;
            console.log('Seçilen COM Port:', this.selectedPort);
            
            // Port seçildiğinde callback çağır
            this.onPortSelected(this.selectedPort);
        });

        // Portları yenile butonu
        this.refreshPortsBtn.addEventListener('click', () => {
            this.refreshPorts();
        });
    }

    /**
     * COM portlarını Tauri backend'den alır ve listeler
     */
    async loadComPorts() {
        try {
            // Yükleme durumunu göster
            this.setLoadingState(true);
            
            // Tauri command'ını çağır
            const ports = await window.__TAURI__.core.invoke('get_com_ports');
            
            // Dropdown'ı temizle
            this.clearPortOptions();
            
            // Portları ekle
            if (ports && ports.length > 0) {
                ports.forEach(port => {
                    this.addPortOption(port);
                });
                console.log('COM Portları yüklendi:', ports);
            } else {
                this.addPortOption('', 'Hiç COM port bulunamadı', true);
                console.log('Hiç COM port bulunamadı');
            }
            
        } catch (error) {
            console.error('COM portları alınırken hata:', error);
            this.clearPortOptions();
            this.addPortOption('', 'Hata: Portlar alınamadı', true);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Portları yeniler
     */
    async refreshPorts() {
        console.log('COM Portları yenileniyor...');
        
        // Loading state'i aktif et
        this.refreshPortsBtn.classList.add('loading');
        this.refreshPortsBtn.disabled = true;
        
        try {
            await this.loadComPorts();
        } finally {
            // Loading state'i kaldır
            setTimeout(() => {
                this.refreshPortsBtn.classList.remove('loading');
                this.refreshPortsBtn.disabled = false;
            }, 500);
        }
    }

    /**
     * Dropdown'ı temizler
     */
    clearPortOptions() {
        this.comPortSelect.innerHTML = '<option value="">Port Seçin...</option>';
    }

    /**
     * Dropdown'a port seçeneği ekler
     */
    addPortOption(value, text = null, disabled = false) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text || value;
        option.disabled = disabled;
        this.comPortSelect.appendChild(option);
    }

    /**
     * Yükleme durumunu ayarlar
     */
    setLoadingState(loading) {
        if (loading) {
            this.comPortSelect.disabled = true;
            this.refreshPortsBtn.disabled = true;
            this.clearPortOptions();
            this.addPortOption('', 'Yükleniyor...', true);
        } else {
            this.comPortSelect.disabled = false;
            this.refreshPortsBtn.disabled = false;
        }
    }

    /**
     * Port seçildiğinde çağrılır
     * @param {string} port - Seçilen port adı
     */
    onPortSelected(port) {
        if (port) {
            console.log(`COM Port seçildi: ${port}`);
            // Burada seçilen port ile ilgili işlemler yapılabilir
            // Örneğin: port bağlantısı, durum güncelleme vb.
        }
    }

    /**
     * Seçili portu döndürür
     */
    getSelectedPort() {
        return this.selectedPort;
    }

    /**
     * Programatik olarak port seçer
     */
    selectPort(portName) {
        if (this.comPortSelect) {
            this.comPortSelect.value = portName;
            this.selectedPort = portName;
            this.onPortSelected(portName);
        }
    }

    /**
     * Port bağlantı durumunu günceller
     */
    setConnectionStatus(isConnected) {
        if (this.comPortSection) {
            if (isConnected) {
                this.comPortSection.classList.add('connected');
            } else {
                this.comPortSection.classList.remove('connected');
            }
        }
    }

    /**
     * Port seçim arayüzünü aktif/pasif yapar
     */
    setEnabled(enabled) {
        if (this.comPortSelect) {
            this.comPortSelect.disabled = !enabled;
        }
        if (this.refreshPortsBtn) {
            this.refreshPortsBtn.disabled = !enabled;
        }
        if (this.comPortSection) {
            this.comPortSection.style.opacity = enabled ? '1' : '0.6';
        }
    }
}

// Global değişken olarak export et
window.ComPortManager = ComPortManager;

// Sayfa yüklendiğinde otomatik başlat
document.addEventListener('DOMContentLoaded', () => {
    window.comPortManager = new ComPortManager();
});