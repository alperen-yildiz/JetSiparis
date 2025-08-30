// JetArayan - COM Port Yönetimi
// Bu modül Tauri backend ile COM port iletişimini yönetir

class ComPortManager {
    constructor() {
        this.isConnected = false;
        this.isListening = false;
        this.selectedPort = null;
        this.onCallerIdReceived = null;
        this.onError = null;
        this.onStatusChange = null;
        
        this.init();
    }

    async init() {
        // Tauri event listener'larını ayarla
        if (window.__TAURI__) {
            const { listen } = window.__TAURI__.event;
            
            // Caller ID verisi alındığında
            await listen('caller-id-received', (event) => {
                console.log('Caller ID alındı:', event.payload);
                if (this.onCallerIdReceived) {
                    this.onCallerIdReceived(event.payload);
                }
            });
            
            // Hata durumunda
            await listen('caller-id-error', (event) => {
                console.error('Caller ID hatası:', event.payload);
                if (this.onError) {
                    this.onError(event.payload);
                }
            });
        }
        
        // Sayfa yüklendiğinde portları listele
        await this.refreshPorts();
        await this.updateStatus();
    }

    // Mevcut COM portlarını listele
    async refreshPorts() {
        try {
            if (!window.__TAURI__) {
                throw new Error('Tauri API bulunamadı');
            }
            
            const { invoke } = window.__TAURI__.core;
            const ports = await invoke('get_com_ports');
            
            const portSelect = document.getElementById('comPortSelect');
            if (portSelect) {
                portSelect.innerHTML = '<option value="">Port Seçin...</option>';
                
                ports.forEach(port => {
                    const option = document.createElement('option');
                    option.value = port;
                    option.textContent = port;
                    portSelect.appendChild(option);
                });
                
                // Eğer daha önce seçilmiş port varsa, onu seç
                if (this.selectedPort && ports.includes(this.selectedPort)) {
                    portSelect.value = this.selectedPort;
                }
            }
            
            return ports;
        } catch (error) {
            console.error('Port listesi alınamadı:', error);
            if (this.onError) {
                this.onError(`Port listesi alınamadı: ${error.message}`);
            }
            return [];
        }
    }

    // COM porta bağlan
    async connectPort(portName) {
        try {
            if (!window.__TAURI__) {
                throw new Error('Tauri API bulunamadı');
            }
            
            if (!portName) {
                throw new Error('Port seçilmedi');
            }
            
            const { invoke } = window.__TAURI__.core;
            const result = await invoke('connect_com_port', { portName });
            
            this.selectedPort = portName;
            this.isConnected = true;
            
            console.log('Port bağlantısı başarılı:', result);
            await this.updateStatus();
            
            if (this.onStatusChange) {
                this.onStatusChange('connected', result);
            }
            
            return result;
        } catch (error) {
            console.error('Port bağlantısı başarısız:', error);
            this.isConnected = false;
            await this.updateStatus();
            
            if (this.onError) {
                this.onError(`Port bağlantısı başarısız: ${error.message}`);
            }
            throw error;
        }
    }

    // COM port bağlantısını kes
    async disconnectPort() {
        try {
            if (!window.__TAURI__) {
                throw new Error('Tauri API bulunamadı');
            }
            
            const { invoke } = window.__TAURI__.core;
            const result = await invoke('disconnect_com_port');
            
            this.isConnected = false;
            this.isListening = false;
            
            console.log('Port bağlantısı kesildi:', result);
            await this.updateStatus();
            
            if (this.onStatusChange) {
                this.onStatusChange('disconnected', result);
            }
            
            return result;
        } catch (error) {
            console.error('Port bağlantısı kesilemedi:', error);
            if (this.onError) {
                this.onError(`Port bağlantısı kesilemedi: ${error.message}`);
            }
            throw error;
        }
    }

    // Caller ID dinlemeyi başlat
    async startListening() {
        try {
            if (!window.__TAURI__) {
                throw new Error('Tauri API bulunamadı');
            }
            
            if (!this.isConnected) {
                throw new Error('Önce COM porta bağlanmalısınız');
            }
            
            const { invoke } = window.__TAURI__.core;
            const result = await invoke('start_caller_id_listening');
            
            this.isListening = true;
            
            console.log('Caller ID dinleme başlatıldı:', result);
            await this.updateStatus();
            
            if (this.onStatusChange) {
                this.onStatusChange('listening', result);
            }
            
            return result;
        } catch (error) {
            console.error('Dinleme başlatılamadı:', error);
            this.isListening = false;
            await this.updateStatus();
            
            if (this.onError) {
                this.onError(`Dinleme başlatılamadı: ${error.message}`);
            }
            throw error;
        }
    }

    // Caller ID dinlemeyi durdur
    async stopListening() {
        try {
            if (!window.__TAURI__) {
                throw new Error('Tauri API bulunamadı');
            }
            
            const { invoke } = window.__TAURI__.core;
            const result = await invoke('stop_caller_id_listening');
            
            this.isListening = false;
            
            console.log('Caller ID dinleme durduruldu:', result);
            await this.updateStatus();
            
            if (this.onStatusChange) {
                this.onStatusChange('stopped', result);
            }
            
            return result;
        } catch (error) {
            console.error('Dinleme durdurulamadı:', error);
            if (this.onError) {
                this.onError(`Dinleme durdurulamadı: ${error.message}`);
            }
            throw error;
        }
    }

    // Durumu güncelle
    async updateStatus() {
        try {
            if (!window.__TAURI__) {
                return;
            }
            
            const { invoke } = window.__TAURI__.core;
            
            // Backend'den gerçek durumu al
            const connectionStatus = await invoke('get_connection_status');
            const listeningStatus = await invoke('get_listening_status');
            
            this.isConnected = connectionStatus;
            this.isListening = listeningStatus;
            
            // UI'ı güncelle
            this.updateUI();
            
        } catch (error) {
            console.error('Durum güncellenemedi:', error);
        }
    }

    // UI elementlerini güncelle
    updateUI() {
        // DOM elementlerini güvenli şekilde al
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const startListeningBtn = document.getElementById('startListeningBtn');
        const stopListeningBtn = document.getElementById('stopListeningBtn');
        const comPortSelect = document.getElementById('comPortSelect');
        const connectionStatus = document.querySelector('.connection-status');
        
        // Eğer gerekli elementler bulunamazsa (farklı sayfa), sessizce çık
        if (!connectBtn && !disconnectBtn && !startListeningBtn && !stopListeningBtn) {
            return;
        }
        
        // Port seçimi
        if (comPortSelect) {
            comPortSelect.disabled = this.isConnected;
        }
        
        // Bağlantı butonları
        if (connectBtn) {
            connectBtn.disabled = this.isConnected || !comPortSelect?.value;
        }
        
        if (disconnectBtn) {
            disconnectBtn.disabled = !this.isConnected;
        }
        
        // Dinleme butonları
        if (startListeningBtn) {
            startListeningBtn.disabled = !this.isConnected || this.isListening;
        }
        
        if (stopListeningBtn) {
            stopListeningBtn.disabled = !this.isListening;
        }
        
        // Bağlantı durumu - null kontrolü ile güvenli erişim
        if (connectionStatus) {
            if (this.isListening) {
                connectionStatus.className = 'connection-status listening';
                connectionStatus.textContent = 'Dinliyor';
            } else if (this.isConnected) {
                connectionStatus.className = 'connection-status connected';
                connectionStatus.textContent = 'Bağlı';
            } else {
                connectionStatus.className = 'connection-status disconnected';
                connectionStatus.textContent = 'Bağlantı Yok';
            }
        }
    }

    // Event handler'ları ayarla
    setCallerIdHandler(handler) {
        this.onCallerIdReceived = handler;
    }

    setErrorHandler(handler) {
        this.onError = handler;
    }

    setStatusChangeHandler(handler) {
        this.onStatusChange = handler;
    }

    // Getter'lar
    getConnectionStatus() {
        return this.isConnected;
    }

    getListeningStatus() {
        return this.isListening;
    }

    getSelectedPort() {
        return this.selectedPort;
    }
}

// Global instance oluştur
const comPortManager = new ComPortManager();

// Export et
export default comPortManager;
export { ComPortManager };