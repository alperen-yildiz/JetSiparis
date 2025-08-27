// JetArayan Dashboard JavaScript
class ArayanDashboard {
    constructor() {
        this.currentCall = null;
        this.callHistory = [];
        this.blockedNumbers = [];
        this.customers = JSON.parse(localStorage.getItem('customers')) || [];
        this.cart = [];
        this.currentCustomer = null;
        this.isOnline = false;
        this.callDurationInterval = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.updateStats();
        this.renderCallHistory();
        this.renderBlockedNumbers();
        this.updateConnectionStatus();
        this.initializeCustomerManagement();
    }

    // Event Listeners
    bindEvents() {
        // Customer management
        document.getElementById('editCustomerBtn')?.addEventListener('click', () => {
            this.editCustomer();
        });
        
        document.getElementById('customerForm')?.addEventListener('submit', (e) => {
            this.handleNewCustomer(e);
        });
        
        document.getElementById('editForm')?.addEventListener('submit', (e) => {
            this.handleEditCustomer(e);
        });
        
        document.getElementById('cancelFormBtn')?.addEventListener('click', () => {
            this.cancelNewCustomer();
        });
        
        document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
            this.cancelEditCustomer();
        });

        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCategory(e.target.dataset.category);
            });
        });

        // Product buttons
        document.querySelectorAll('.product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.addToCart(e.currentTarget.dataset.product, e.currentTarget.dataset.price);
            });
        });

        // Cart actions
        document.getElementById('clearCartBtn')?.addEventListener('click', () => {
            this.clearCart();
        });
        
        document.getElementById('completeOrderBtn')?.addEventListener('click', () => {
            this.completeOrder();
        });

        // Settings modal
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openModal('settingsModal');
            });
        }

        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.closeModal('settingsModal');
            });
        }

        // Block number modal
        const blockNumberBtn = document.getElementById('blockNumberBtn');
        if (blockNumberBtn) {
            blockNumberBtn.addEventListener('click', () => {
                this.openModal('blockNumberModal');
            });
        }

        const closeBlockModalBtn = document.getElementById('closeBlockModalBtn');
        if (closeBlockModalBtn) {
            closeBlockModalBtn.addEventListener('click', () => {
                this.closeModal('blockNumberModal');
            });
        }

        const confirmBlockBtn = document.getElementById('confirmBlockBtn');
        if (confirmBlockBtn) {
            confirmBlockBtn.addEventListener('click', () => {
                this.blockNumber();
            });
        }

        const cancelBlockBtn = document.getElementById('cancelBlockBtn');
        if (cancelBlockBtn) {
            cancelBlockBtn.addEventListener('click', () => {
                this.closeModal('blockNumberModal');
            });
        }

        // Quick actions
        const addContactBtn = document.getElementById('addContactBtn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => {
                this.addContact();
            });
        }

        const callHistoryBtn = document.getElementById('callHistoryBtn');
        if (callHistoryBtn) {
            callHistoryBtn.addEventListener('click', () => {
                this.showCallHistory();
            });
        }

        const reportSpamBtn = document.getElementById('reportSpamBtn');
        if (reportSpamBtn) {
            reportSpamBtn.addEventListener('click', () => {
                this.reportSpam();
            });
        }

        const viewAllCallsBtn = document.getElementById('viewAllCallsBtn');
        if (viewAllCallsBtn) {
            viewAllCallsBtn.addEventListener('click', () => {
                this.showCallHistory();
            });
        }

        const manageBlockedBtn = document.getElementById('manageBlockedBtn');
        if (manageBlockedBtn) {
            manageBlockedBtn.addEventListener('click', () => {
                this.manageBlockedNumbers();
            });
        }

        // Call actions
        const answerBtn = document.getElementById('answerBtn');
        if (answerBtn) {
            answerBtn.addEventListener('click', () => {
                this.answerCall();
            });
        }

        const declineBtn = document.getElementById('declineBtn');
        if (declineBtn) {
            declineBtn.addEventListener('click', () => {
                this.declineCall();
            });
        }

        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.toggleMute();
            });
        }

        // Settings options
        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearHistory();
            });
        }

        const resetAppBtn = document.getElementById('resetAppBtn');
        if (resetAppBtn) {
            resetAppBtn.addEventListener('click', () => {
                this.resetApp();
            });
        }

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    // Modal Management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        modal.style.display = 'none';
        
        // Clear form data if it's block number modal
        if (modalId === 'blockNumberModal') {
            document.getElementById('blockNumberInput').value = '';
            document.getElementById('blockReasonInput').value = '';
        }
    }

    // Customer Management
    initializeCustomerManagement() {
        // Demo müşteri verileri
        if (this.customers.length === 0) {
            this.customers = [
                {
                    id: 1,
                    phone: '+90 532 123 45 67',
                    firstName: 'Ahmet',
                    lastName: 'Yılmaz',
                    address: 'Kadıköy, İstanbul',
                    note: 'VIP müşteri',
                    regDate: '2024-01-15',
                    callCount: 5
                },
                {
                    id: 2,
                    phone: '+90 505 987 65 43',
                    firstName: 'Ayşe',
                    lastName: 'Demir',
                    address: 'Çankaya, Ankara',
                    note: '',
                    regDate: '2024-02-20',
                    callCount: 2
                }
            ];
            this.saveCustomers();
        }
    }

    // Call Management
    simulateIncomingCall(callerData = null) {
        const demoNumbers = [
            '+90 532 123 45 67',
            '+90 505 987 65 43',
            '+90 541 555 12 34',
            '+90 555 999 88 77'
        ];
        
        const randomNumber = demoNumbers[Math.floor(Math.random() * demoNumbers.length)];
        this.receiveCall(randomNumber);
    }

    receiveCall(number) {
        this.currentCall = {
            number: number,
            startTime: new Date(),
            status: 'incoming'
        };
        
        this.showIncomingCall(number);
        this.queryCustomer(number);
        this.showNotification(`Gelen arama`, `${number}`);
    }

    showIncomingCall(number) {
        const incomingNumber = document.getElementById('incomingNumber');
        const customerSection = document.getElementById('customerManagementSection');
        
        if (incomingNumber && customerSection) {
            incomingNumber.textContent = number;
            customerSection.style.display = 'block';
        }
    }

    queryCustomer(phone) {
        // Sunucu sorgulaması simülasyonu
        const customer = this.customers.find(c => c.phone === phone);
        
        if (customer) {
            this.showExistingCustomer(customer);
            this.currentCustomer = customer;
            // Arama sayısını artır
            customer.callCount++;
            this.saveCustomers();
        } else {
            this.showNewCustomerForm(phone);
        }
    }

    showExistingCustomer(customer) {
        const existingCard = document.getElementById('existingCustomerCard');
        const newForm = document.getElementById('newCustomerForm');
        const editForm = document.getElementById('editCustomerForm');
        const orderSection = document.getElementById('orderSection');
        const cartSection = document.getElementById('cartSection');
        
        // Müşteri bilgilerini doldur
        document.getElementById('customerFullName').textContent = `${customer.firstName} ${customer.lastName}`;
        document.getElementById('customerPhone').textContent = customer.phone;
        document.getElementById('customerAddress').textContent = customer.address;
        document.getElementById('customerNote').textContent = customer.note || '-';
        document.getElementById('customerRegDate').textContent = customer.regDate;
        document.getElementById('customerCallCount').textContent = customer.callCount;
        
        // Görünürlük ayarları
        existingCard.style.display = 'block';
        newForm.style.display = 'none';
        editForm.style.display = 'none';
        orderSection.style.display = 'block';
        cartSection.style.display = 'block';
    }

    showNewCustomerForm(phone) {
        const existingCard = document.getElementById('existingCustomerCard');
        const newForm = document.getElementById('newCustomerForm');
        const editForm = document.getElementById('editCustomerForm');
        const orderSection = document.getElementById('orderSection');
        const cartSection = document.getElementById('cartSection');
        
        // Görünürlük ayarları
        existingCard.style.display = 'none';
        newForm.style.display = 'block';
        editForm.style.display = 'none';
        orderSection.style.display = 'none';
        cartSection.style.display = 'none';
        
        // Telefon numarasını otomatik doldur (gizli alan olarak)
        this.newCustomerPhone = phone;
    }

    editCustomer() {
        if (!this.currentCustomer) return;
        
        const existingCard = document.getElementById('existingCustomerCard');
        const editForm = document.getElementById('editCustomerForm');
        
        // Form alanlarını doldur
        document.getElementById('editFirstName').value = this.currentCustomer.firstName;
        document.getElementById('editLastName').value = this.currentCustomer.lastName;
        document.getElementById('editAddress').value = this.currentCustomer.address;
        document.getElementById('editNote').value = this.currentCustomer.note || '';
        
        // Görünürlük değiştir
        existingCard.style.display = 'none';
        editForm.style.display = 'block';
    }

    handleNewCustomer(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const newCustomer = {
            id: Date.now(),
            phone: this.newCustomerPhone,
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            address: formData.get('address'),
            note: formData.get('note') || '',
            regDate: new Date().toISOString().split('T')[0],
            callCount: 1
        };
        
        this.customers.push(newCustomer);
        this.saveCustomers();
        this.currentCustomer = newCustomer;
        
        // Formu temizle ve müşteri bilgilerini göster
        e.target.reset();
        this.showExistingCustomer(newCustomer);
        this.showNotification('Müşteri kaydedildi', `${newCustomer.firstName} ${newCustomer.lastName}`);
    }

    handleEditCustomer(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        this.currentCustomer.firstName = formData.get('editFirstName');
        this.currentCustomer.lastName = formData.get('editLastName');
        this.currentCustomer.address = formData.get('editAddress');
        this.currentCustomer.note = formData.get('editNote') || '';
        
        this.saveCustomers();
        this.showExistingCustomer(this.currentCustomer);
        this.showNotification('Müşteri güncellendi', `${this.currentCustomer.firstName} ${this.currentCustomer.lastName}`);
    }

    cancelNewCustomer() {
        const newForm = document.getElementById('newCustomerForm');
        const customerForm = document.getElementById('customerForm');
        
        newForm.style.display = 'none';
        customerForm.reset();
    }

    cancelEditCustomer() {
        const editForm = document.getElementById('editCustomerForm');
        const existingCard = document.getElementById('existingCustomerCard');
        
        editForm.style.display = 'none';
        existingCard.style.display = 'block';
    }

    saveCustomers() {
        localStorage.setItem('customers', JSON.stringify(this.customers));
    }

    // Sipariş yönetimi
    switchCategory(category) {
        // Kategori butonlarını güncelle
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Ürün gruplarını göster/gizle
        document.querySelectorAll('.product-group').forEach(group => {
            group.style.display = group.dataset.category === category ? 'grid' : 'none';
        });
    }

    addToCart(productName, price) {
        const existingItem = this.cart.find(item => item.name === productName);
        
        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.cart.push({
                name: productName,
                price: parseInt(price),
                quantity: 1
            });
        }
        
        this.updateProductCount(productName);
        this.updateCartDisplay();
    }

    updateProductCount(productName) {
        const countElement = document.getElementById(`count-${productName}`);
        const cartItem = this.cart.find(item => item.name === productName);
        
        if (countElement && cartItem) {
            countElement.textContent = cartItem.quantity;
            countElement.classList.add('visible');
        }
    }

    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        const totalAmount = document.getElementById('totalAmount');
        const orderBtn = document.getElementById('completeOrderBtn');
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Sepet boş</p>
                </div>
            `;
            totalAmount.textContent = '0₺';
            orderBtn.disabled = true;
        } else {
            cartItems.innerHTML = this.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${item.price}₺ x ${item.quantity}</div>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="dashboard.changeQuantity('${item.name}', -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="dashboard.changeQuantity('${item.name}', 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totalAmount.textContent = `${total}₺`;
            orderBtn.disabled = false;
        }
    }

    changeQuantity(productName, change) {
        const item = this.cart.find(item => item.name === productName);
        
        if (item) {
            item.quantity += change;
            
            if (item.quantity <= 0) {
                this.cart = this.cart.filter(cartItem => cartItem.name !== productName);
                const countElement = document.getElementById(`count-${productName}`);
                if (countElement) {
                    countElement.textContent = '0';
                    countElement.classList.remove('visible');
                }
            } else {
                this.updateProductCount(productName);
            }
            
            this.updateCartDisplay();
        }
    }

    clearCart() {
        this.cart = [];
        
        // Tüm ürün sayaçlarını sıfırla
        document.querySelectorAll('.product-count').forEach(count => {
            count.textContent = '0';
            count.classList.remove('visible');
        });
        
        this.updateCartDisplay();
        this.showNotification('Sepet temizlendi', '');
    }

    completeOrder() {
        if (this.cart.length === 0 || !this.currentCustomer) return;
        
        const order = {
            id: Date.now(),
            customer: this.currentCustomer,
            items: [...this.cart],
            total: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            date: new Date().toISOString(),
            phone: this.currentCall.number
        };
        
        // Siparişi kaydet
        const orders = JSON.parse(localStorage.getItem('orders')) || [];
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));
        
        // Sepeti temizle
        this.clearCart();
        
        // Arama geçmişine ekle
        this.addToCallHistory();
        
        this.showNotification('Sipariş tamamlandı', `Toplam: ${order.total}₺`);
        
        // Arama sonlandır
        this.endCall();
    }

    endCall() {
        if (this.currentCall) {
            this.currentCall.status = 'ended';
            this.currentCall.endTime = new Date();
            
            this.hideCurrentCall();
            this.showNotification('Arama sonlandırıldı', '');
            this.currentCall = null;
            this.currentCustomer = null;
        }
    }

    hideCurrentCall() {
        const customerSection = document.getElementById('customerManagementSection');
        if (customerSection) {
            customerSection.style.display = 'none';
        }
        
        // Forları sıfırla
        const forms = ['existingCustomerCard', 'newCustomerForm', 'editCustomerForm', 'orderSection', 'cartSection'];
        forms.forEach(formId => {
            const element = document.getElementById(formId);
            if (element) element.style.display = 'none';
        });
        
        // Sepeti temizle
        this.clearCart();
    }

    startCallDuration() {
        let seconds = 0;
        this.callDurationInterval = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            document.getElementById('callDuration').textContent = timeString;
        }, 1000);
    }

    stopCallDuration() {
        if (this.callDurationInterval) {
            clearInterval(this.callDurationInterval);
            this.callDurationInterval = null;
        }
    }

    answerCall() {
        if (!this.currentCall) return;
        
        // Show mute button, hide answer/decline
        document.getElementById('answerBtn').style.display = 'none';
        document.getElementById('declineBtn').style.display = 'none';
        document.getElementById('muteBtn').style.display = 'flex';
        
        // Update call status
        const statusBadge = document.querySelector('.call-status-badge');
        statusBadge.innerHTML = '<i class="fas fa-phone"></i><span>Konuşuyor</span>';
        statusBadge.className = 'call-status-badge outgoing';
        
        // Add to call history
        this.addToCallHistory(this.currentCall, 'answered');
        this.updateStats();
        
        this.showNotification('Arama cevaplandı', 'success');
    }

    declineCall() {
        if (!this.currentCall) return;
        
        // Add to call history
        this.addToCallHistory(this.currentCall, 'declined');
        this.hideCurrentCall();
        this.updateStats();
        
        this.showNotification('Arama reddedildi', 'info');
        this.currentCall = null;
    }

    toggleMute() {
        const muteBtn = document.getElementById('muteBtn');
        const icon = muteBtn.querySelector('i');
        const text = muteBtn.querySelector('span');
        
        if (icon.classList.contains('fa-microphone-slash')) {
            icon.className = 'fas fa-microphone';
            text.textContent = 'Mikrofon Aç';
            this.showNotification('Mikrofon kapatıldı', 'warning');
        } else {
            icon.className = 'fas fa-microphone-slash';
            text.textContent = 'Sustur';
            this.showNotification('Mikrofon açıldı', 'success');
        }
    }

    // Call History Management
    addToCallHistory() {
        if (this.currentCall) {
            const historyEntry = {
                ...this.currentCall,
                id: Date.now(),
                customer: this.currentCustomer ? `${this.currentCustomer.firstName} ${this.currentCustomer.lastName}` : 'Bilinmeyen',
                duration: this.currentCall.answerTime ? 
                    Math.floor((this.currentCall.endTime - this.currentCall.answerTime) / 1000) : 0
            };
            
            this.callHistory.unshift(historyEntry);
            
            // Keep only last 100 calls
            if (this.callHistory.length > 100) {
                this.callHistory = this.callHistory.slice(0, 100);
            }
            
            this.saveData();
            this.renderCallHistory();
            this.updateStats();
        }
    }

    renderCallHistory() {
        const callsList = document.getElementById('callsList');
        
        if (this.callHistory.length === 0) {
            callsList.innerHTML = '<div class="empty-state"><p>Henüz arama geçmişi bulunmuyor.</p></div>';
            return;
        }
        
        const recentCalls = this.callHistory.slice(0, 5); // Show only last 5 calls
        
        callsList.innerHTML = recentCalls.map(call => {
            const iconClass = this.getCallIconClass(call.status);
            const timeAgo = this.getTimeAgo(call.timestamp);
            
            return `
                <div class="call-item">
                    <div class="call-type-icon ${call.status}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="call-info">
                        <h4>${call.caller.name}</h4>
                        <p>${call.caller.number}</p>
                    </div>
                    <div class="call-time">
                        <div>${timeAgo}</div>
                        <div style="font-size: 12px; color: #94a3b8;">${call.duration}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getCallIconClass(status) {
        switch (status) {
            case 'answered': return 'fas fa-phone-volume';
            case 'declined': return 'fas fa-phone-slash';
            case 'missed': return 'fas fa-phone-times';
            case 'outgoing': return 'fas fa-phone';
            default: return 'fas fa-phone';
        }
    }

    // Block Number Management
    blockNumber() {
        const numberInput = document.getElementById('blockNumberInput');
        const reasonInput = document.getElementById('blockReasonInput');
        
        const number = numberInput.value.trim();
        const reason = reasonInput.value;
        
        if (!number) {
            this.showNotification('Lütfen bir telefon numarası girin', 'error');
            return;
        }
        
        // Check if already blocked
        if (this.blockedNumbers.find(blocked => blocked.number === number)) {
            this.showNotification('Bu numara zaten engellenmiş', 'warning');
            return;
        }
        
        const blockedNumber = {
            id: Date.now(),
            number: number,
            reason: reason || 'Belirtilmemiş',
            timestamp: new Date()
        };
        
        this.blockedNumbers.push(blockedNumber);
        this.saveData();
        this.renderBlockedNumbers();
        this.updateStats();
        
        this.closeModal('blockNumberModal');
        this.showNotification('Numara başarıyla engellendi', 'success');
    }

    unblockNumber(id) {
        this.blockedNumbers = this.blockedNumbers.filter(blocked => blocked.id !== id);
        this.saveData();
        this.renderBlockedNumbers();
        this.updateStats();
        this.showNotification('Numara engeli kaldırıldı', 'info');
    }

    renderBlockedNumbers() {
        const blockedList = document.getElementById('blockedList');
        
        if (this.blockedNumbers.length === 0) {
            blockedList.innerHTML = '<div class="empty-state"><p>Henüz engellenmiş numara bulunmuyor.</p></div>';
            return;
        }
        
        const recentBlocked = this.blockedNumbers.slice(0, 3); // Show only last 3 blocked numbers
        
        blockedList.innerHTML = recentBlocked.map(blocked => {
            const timeAgo = this.getTimeAgo(blocked.timestamp);
            
            return `
                <div class="blocked-item">
                    <div class="blocked-info">
                        <h4>${blocked.number}</h4>
                        <p>${blocked.reason} • ${timeAgo}</p>
                    </div>
                    <button class="unblock-btn" onclick="dashboard.unblockNumber(${blocked.id})">
                        Engeli Kaldır
                    </button>
                </div>
            `;
        }).join('');
    }

    // Statistics
    updateStats() {
        const totalCalls = this.callHistory.length;
        const answeredCalls = this.callHistory.filter(call => call.status === 'answered').length;
        const blockedCalls = this.blockedNumbers.length;
        
        // Calculate average call duration
        const answeredCallsWithDuration = this.callHistory.filter(call => 
            call.status === 'answered' && call.duration && call.duration !== '00:00'
        );
        
        let avgDuration = 0;
        if (answeredCallsWithDuration.length > 0) {
            const totalSeconds = answeredCallsWithDuration.reduce((total, call) => {
                const [minutes, seconds] = call.duration.split(':').map(Number);
                return total + (minutes * 60) + seconds;
            }, 0);
            avgDuration = Math.round(totalSeconds / answeredCallsWithDuration.length / 60);
        }
        
        document.getElementById('totalCalls').textContent = totalCalls;
        document.getElementById('answeredCalls').textContent = answeredCalls;
        document.getElementById('blockedCalls').textContent = blockedCalls;
        document.getElementById('avgCallDuration').textContent = `${avgDuration} dk`;
    }

    // Connection Status
    updateConnectionStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (this.isOnline) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Çevrimiçi';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Çevrimdışı';
        }
    }

    toggleConnectionStatus() {
        this.isOnline = !this.isOnline;
        this.updateConnectionStatus();
        
        const message = this.isOnline ? 'Çevrimiçi duruma geçildi' : 'Çevrimdışı duruma geçildi';
        this.showNotification(message, this.isOnline ? 'success' : 'warning');
    }

    // Quick Actions
    addContact() {
        if (this.currentCall) {
            this.showNotification(`${this.currentCall.name} kişi listesine eklendi`, 'success');
        } else {
            this.showNotification('Eklenecek kişi bulunamadı', 'warning');
        }
    }

    showCallHistory() {
        this.showNotification('Arama geçmişi açılıyor...', 'info');
        // Here you would typically open a detailed call history view
    }

    reportSpam() {
        if (this.currentCall) {
            this.showNotification(`${this.currentCall.number} spam olarak bildirildi`, 'success');
            // Automatically block the number
            const blockedNumber = {
                id: Date.now(),
                number: this.currentCall.number,
                reason: 'Spam/Reklam',
                timestamp: new Date()
            };
            this.blockedNumbers.push(blockedNumber);
            this.saveData();
            this.renderBlockedNumbers();
        } else {
            this.showNotification('Bildirilecek arama bulunamadı', 'warning');
        }
    }

    manageBlockedNumbers() {
        this.showNotification('Engellenen numaralar yönetimi açılıyor...', 'info');
        // Here you would typically open a detailed blocked numbers management view
    }

    // Settings Actions
    exportData() {
        const data = {
            callHistory: this.callHistory,
            blockedNumbers: this.blockedNumbers,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `jetarayan-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Veriler başarıyla dışa aktarıldı', 'success');
    }

    clearHistory() {
        if (confirm('Tüm arama geçmişini silmek istediğinizden emin misiniz?')) {
            this.callHistory = [];
            this.saveData();
            this.renderCallHistory();
            this.updateStats();
            this.showNotification('Arama geçmişi temizlendi', 'info');
        }
    }

    resetApp() {
        if (confirm('Uygulamayı sıfırlamak istediğinizden emin misiniz? Tüm veriler silinecektir.')) {
            this.callHistory = [];
            this.blockedNumbers = [];
            this.currentCall = null;
            this.isOnline = false;
            
            localStorage.removeItem('jetarayan-data');
            
            this.updateStats();
            this.renderCallHistory();
            this.renderBlockedNumbers();
            this.updateConnectionStatus();
            this.hideCurrentCall();
            
            this.showNotification('Uygulama başarıyla sıfırlandı', 'success');
        }
    }

    // Utility Functions
    getTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} gün önce`;
        if (hours > 0) return `${hours} saat önce`;
        if (minutes > 0) return `${minutes} dakika önce`;
        return 'Az önce';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            border-left: 4px solid ${this.getNotificationColor(type)};
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-info-circle';
        }
    }

    getNotificationColor(type) {
        switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'info': return '#06b6d4';
            default: return '#06b6d4';
        }
    }

    // Data Persistence
    saveData() {
        const data = {
            callHistory: this.callHistory,
            blockedNumbers: this.blockedNumbers,
            isOnline: this.isOnline
        };
        localStorage.setItem('jetarayan-data', JSON.stringify(data));
    }

    loadData() {
        const savedData = localStorage.getItem('jetarayan-data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.callHistory = data.callHistory || [];
                this.blockedNumbers = data.blockedNumbers || [];
                this.isOnline = data.isOnline || false;
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        }
    }

    // Demo Functions
    startDemo() {
        // Simulate some demo data
        this.addDemoData();
        
        // Simulate an incoming call after 2 seconds
        setTimeout(() => {
            this.simulateIncomingCall({
                name: 'Ahmet Yılmaz',
                number: '+90 532 123 45 67',
                location: 'İstanbul, Türkiye',
                avatar: null,
                isSpam: false
            });
        }, 2000);
    }

    addDemoData() {
        // Add some demo call history
        const demoHistory = [
            {
                id: Date.now() - 1000,
                caller: { name: 'Mehmet Demir', number: '+90 533 987 65 43' },
                status: 'answered',
                timestamp: new Date(Date.now() - 3600000), // 1 hour ago
                duration: '03:45'
            },
            {
                id: Date.now() - 2000,
                caller: { name: 'Bilinmeyen', number: '+90 212 555 12 34' },
                status: 'declined',
                timestamp: new Date(Date.now() - 7200000), // 2 hours ago
                duration: '00:00'
            }
        ];
        
        // Add some demo blocked numbers
        const demoBlocked = [
            {
                id: Date.now() - 3000,
                number: '+90 850 123 45 67',
                reason: 'Spam/Reklam',
                timestamp: new Date(Date.now() - 86400000) // 1 day ago
            }
        ];
        
        this.callHistory = [...demoHistory, ...this.callHistory];
        this.blockedNumbers = [...demoBlocked, ...this.blockedNumbers];
        this.saveData();
    }
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: #1e293b;
    }
    
    .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: #64748b;
        font-style: italic;
    }
`;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ArayanDashboard();
    
    // Start demo mode (remove this in production)
    dashboard.startDemo();
    
    // Add click handler for connection status toggle (for demo)
    document.getElementById('callStatus').addEventListener('click', () => {
        dashboard.toggleConnectionStatus();
    });
});

// Global function for cart quantity changes
window.dashboard = null;
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new ArayanDashboard();
});