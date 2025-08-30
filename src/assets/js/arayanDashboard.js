// JetArayan Dashboard JavaScript
// Firebase müşteri yönetimi için customerManager'ı import et
import customerManager from '../../js/customerManager.js';

class ArayanDashboard {
    constructor() {
        // Kurulum kontrolü - eğer kurulum tamamlanmamışsa onboarding'e yönlendir
        const isDevEnv = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
        if (!this.checkSetupComplete()) {
            // Geliştirme/önizleme ortamında yönlendirme yapmadan demo modda devam et
            if (!isDevEnv) {
                window.location.href = './onboarding/arayanOnboarding.html';
                return;
            } else {
                console.warn('Kurulum tamamlanmadı - geliştirme ortamında demo modda devam ediliyor.');
            }
        }
        
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

        // Modern Category buttons
        document.querySelectorAll('.modern-category-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.switchCategory(category);
            });
        });

        // Modern Product buttons - Plus buttons
        document.querySelectorAll('.modern-product-card .quantity-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.modern-product-card');
                this.addToCart(card.dataset.product, card.dataset.price);
            });
        });

        // Modern Product buttons - Minus buttons
        document.querySelectorAll('.modern-product-card .quantity-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.modern-product-card');
                this.changeQuantity(card.dataset.product, -1);
            });
        });

        // Cart actions
        document.getElementById('clearCartBtn')?.addEventListener('click', () => {
            this.clearCart();
        });
        
        document.getElementById('completeOrderBtn')?.addEventListener('click', () => {
            this.completeOrder();
        });

        // Modern Cart actions
        document.querySelector('.modern-clear-btn')?.addEventListener('click', () => {
            this.clearCart();
        });
        
        document.querySelector('.modern-order-btn')?.addEventListener('click', () => {
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

        // Yeni müşteri formu için event listener'lar
        const districtSelect = document.getElementById('districtSelect');
        if (districtSelect) {
            districtSelect.addEventListener('change', async (e) => {
                const districtId = e.target.value;
                if (districtId && cityManager) {
                    await cityManager.populateNeighborhoodSelect(districtId);
                } else {
                    const neighborhoodSelect = document.getElementById('neighborhoodSelect');
                    if (neighborhoodSelect) {
                        neighborhoodSelect.innerHTML = '<option value="">Mahalle seçiniz...</option>';
                        neighborhoodSelect.disabled = true;
                    }
                }
            });
        }

        // Düzenleme formu için event listener'lar
        const editDistrictSelect = document.getElementById('editDistrictSelect');
        if (editDistrictSelect) {
            editDistrictSelect.addEventListener('change', async (e) => {
                const districtId = e.target.value;
                if (districtId && cityManager) {
                    await cityManager.populateEditNeighborhoodSelect(districtId);
                } else {
                    const editNeighborhoodSelect = document.getElementById('editNeighborhoodSelect');
                    if (editNeighborhoodSelect) {
                        editNeighborhoodSelect.innerHTML = '<option value="">Mahalle seçiniz...</option>';
                        editNeighborhoodSelect.disabled = true;
                    }
                }
            });
        }
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
            // Firebase entegrasyonu ile artık gerekli değil
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

    async queryCustomer(phone) {
        try {
            // Loading göster
            this.showLoadingState();
            
            // Firebase'den müşteri sorgula
            const result = await customerManager.queryCustomerByPhone(phone);
            
            if (result.found) {
                this.showExistingCustomer(result.customer);
                this.currentCustomer = result.customer;
            } else {
                this.showNewCustomerForm(phone);
            }
        } catch (error) {
            console.error('Müşteri sorgulama hatası:', error);
            this.showNotification('Hata', 'Müşteri sorgulanırken bir hata oluştu.', 'error');
            this.showNewCustomerForm(phone);
        } finally {
            this.hideLoadingState();
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
        
        // Şehir bilgisini güncelle
        if (cityManager) {
            cityManager.updateCityDisplay(cityManager.getSelectedCity());
        }
    }

    editCustomer() {
        if (!this.currentCustomer) return;
        
        const existingCard = document.getElementById('existingCustomerCard');
        const editForm = document.getElementById('editCustomerForm');
        
        // Form alanlarını doldur
        document.getElementById('editFirstName').value = this.currentCustomer.firstName;
        document.getElementById('editLastName').value = this.currentCustomer.lastName;
        document.getElementById('editNote').value = this.currentCustomer.note || '';
        
        // Adres bilgilerini parse et ve form alanlarını doldur
        this.populateEditAddressForm();
        
        // Görünürlük değiştir
        existingCard.style.display = 'none';
        editForm.style.display = 'block';
    }

    async handleNewCustomer(e) {
        e.preventDefault();
        
        // Şehir seçimi kontrolü
        if (!cityManager || !cityManager.getSelectedCity()) {
            this.showNotification('Hata', 'Lütfen önce ayarlardan şehir seçiniz.', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const addressInfo = cityManager.getFullAddress();
        
        // Form validasyonu
        if (!formData.get('firstName') || !formData.get('lastName')) {
            this.showNotification('Hata', 'Ad ve soyad alanları zorunludur.', 'error');
            return;
        }
        
        if (!formData.get('district') || !formData.get('neighborhood') || !formData.get('street') || !formData.get('buildingNumber')) {
            this.showNotification('Hata', 'İlçe, mahalle, sokak/cadde ve bina no alanları zorunludur.', 'error');
            return;
        }
        
        try {
            // Loading göster
            this.showLoadingState();
            
            const customerData = {
                phone: this.newCustomerPhone,
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                address: addressInfo.formatted,
                addressDetails: addressInfo.details,
                note: formData.get('note') || ''
            };
            
            // Firebase'e kaydet
            const result = await customerManager.saveNewCustomer(customerData);
            
            if (result.success) {
                this.currentCustomer = result.customer;
                
                // Formu temizle ve müşteri bilgilerini göster
                e.target.reset();
                this.resetAddressForm();
                this.showExistingCustomer(result.customer);
                this.showNotification('Başarılı', `${result.customer.firstName} ${result.customer.lastName} kaydedildi.`, 'success');
            } else {
                this.showNotification('Hata', `Müşteri kaydedilemedi: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Müşteri kaydetme hatası:', error);
            this.showNotification('Hata', 'Müşteri kaydedilirken bir hata oluştu.', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    async handleEditCustomer(e) {
        e.preventDefault();
        
        // Şehir seçimi kontrolü
        if (!cityManager || !cityManager.getSelectedCity()) {
            this.showNotification('Hata', 'Lütfen önce ayarlardan şehir seçiniz.', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        
        // Temel bilgileri al
        const firstName = formData.get('editFirstName')?.trim();
        const lastName = formData.get('editLastName')?.trim();
        
        // Validasyon
        if (!firstName || !lastName) {
            this.showNotification('Hata', 'Ad ve soyad alanları zorunludur.', 'error');
            return;
        }
        
        // Adres bilgilerini al
        const district = formData.get('editDistrictSelect');
        const neighborhood = formData.get('editNeighborhoodSelect');
        const street = formData.get('editStreet')?.trim();
        const buildingNumber = formData.get('editBuildingNumber')?.trim();
        
        if (!district || !neighborhood || !street || !buildingNumber) {
            this.showNotification('Hata', 'İlçe, mahalle, sokak/cadde ve bina no alanları zorunludur.', 'error');
            return;
        }
        
        try {
            // Loading göster
            this.showLoadingState();
            
            // Tam adres oluştur
            const addressDetails = {
                district: district,
                neighborhood: neighborhood,
                street: street,
                buildingName: formData.get('editBuildingName')?.trim() || '',
                buildingNumber: buildingNumber,
                apartment: formData.get('editApartment')?.trim() || '',
                floor: formData.get('editFloor')?.trim() || '',
                city: cityManager.getSelectedCity()
            };
            
            const fullAddress = customerManager.formatAddress(addressDetails);
            
            const updateData = {
                firstName: firstName,
                lastName: lastName,
                address: fullAddress,
                addressDetails: addressDetails,
                note: formData.get('editNote')?.trim() || ''
            };
            
            // Firebase'de güncelle
            const result = await customerManager.updateCustomer(this.currentCustomer.id, updateData);
            
            if (result.success) {
                // Local customer objesini güncelle
                this.currentCustomer.firstName = firstName;
                this.currentCustomer.lastName = lastName;
                this.currentCustomer.address = fullAddress;
                this.currentCustomer.addressDetails = addressDetails;
                this.currentCustomer.note = updateData.note;
                
                this.showExistingCustomer(this.currentCustomer);
                this.showNotification('Başarılı', `${this.currentCustomer.firstName} ${this.currentCustomer.lastName} güncellendi.`, 'success');
            } else {
                this.showNotification('Hata', `Müşteri güncellenemedi: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Müşteri güncelleme hatası:', error);
            this.showNotification('Hata', 'Müşteri güncellenirken bir hata oluştu.', 'error');
        } finally {
            this.hideLoadingState();
        }
    }
    
    // Adres formunu sıfırla
    resetAddressForm() {
        const districtSelect = document.getElementById('districtSelect');
        const neighborhoodSelect = document.getElementById('neighborhoodSelect');
        
        if (districtSelect) {
            districtSelect.innerHTML = '<option value="">İlçe seçiniz...</option>';
            districtSelect.disabled = true;
        }
        
        if (neighborhoodSelect) {
            neighborhoodSelect.innerHTML = '<option value="">Mahalle seçiniz...</option>';
            neighborhoodSelect.disabled = true;
        }
    }

    // Düzenleme formundaki adres alanlarını doldur
    async populateEditAddressForm() {
        if (!this.currentCustomer || !this.currentCustomer.address) return;
        
        // Şehir bilgisini göster
        const selectedCityElement = document.getElementById('editSelectedCity');
        if (selectedCityElement && cityManager) {
            selectedCityElement.value = cityManager.getSelectedCity() || 'Şehir seçilmemiş';
        }
        
        // Adres bilgilerini parse et (basit bir yaklaşım)
        const address = this.currentCustomer.address;
        const editDistrictSelect = document.getElementById('editDistrictSelect');
        const editNeighborhoodSelect = document.getElementById('editNeighborhoodSelect');
        const editBuildingName = document.getElementById('editBuildingName');
        const editBuildingNumber = document.getElementById('editBuildingNumber');
        const editApartment = document.getElementById('editApartment');
        const editFloor = document.getElementById('editFloor');
        
        // Mevcut adres bilgilerini temizle
        if (editDistrictSelect) {
            editDistrictSelect.innerHTML = '<option value="">İlçe seçiniz...</option>';
            editDistrictSelect.disabled = true;
        }
        if (editNeighborhoodSelect) {
            editNeighborhoodSelect.innerHTML = '<option value="">Mahalle seçiniz...</option>';
            editNeighborhoodSelect.disabled = true;
        }
        if (editBuildingName) editBuildingName.value = '';
        if (editBuildingNumber) editBuildingNumber.value = '';
        if (editApartment) editApartment.value = '';
        if (editFloor) editFloor.value = '';
        
        // İlçe dropdown'ını doldur
        if (cityManager && cityManager.getSelectedCity()) {
            await cityManager.populateEditDistrictSelect();
        }
        
        // Not: Gerçek bir uygulamada adres bilgilerini ayrı ayrı saklayıp
        // burada yüklemek daha iyi olurdu. Şimdilik mevcut adres string'ini gösteriyoruz.
        console.log('Mevcut adres:', address);
    }

    cancelNewCustomer() {
        const newForm = document.getElementById('newCustomerForm');
        const customerForm = document.getElementById('customerForm');
        
        newForm.style.display = 'none';
        customerForm.reset();
        this.resetAddressForm();
    }

    cancelEditCustomer() {
        const editForm = document.getElementById('editCustomerForm');
        const existingCard = document.getElementById('existingCustomerCard');
        
        // Düzenleme formundaki adres alanlarını sıfırla
        this.resetEditAddressForm();
        
        editForm.style.display = 'none';
        existingCard.style.display = 'block';
    }

    // Düzenleme formundaki adres alanlarını sıfırla
    resetEditAddressForm() {
        const editDistrictSelect = document.getElementById('editDistrictSelect');
        const editNeighborhoodSelect = document.getElementById('editNeighborhoodSelect');
        const editBuildingName = document.getElementById('editBuildingName');
        const editBuildingNumber = document.getElementById('editBuildingNumber');
        const editApartment = document.getElementById('editApartment');
        const editFloor = document.getElementById('editFloor');
        
        if (editDistrictSelect) {
            editDistrictSelect.innerHTML = '<option value="">İlçe seçiniz...</option>';
            editDistrictSelect.disabled = true;
        }
        
        if (editNeighborhoodSelect) {
            editNeighborhoodSelect.innerHTML = '<option value="">Mahalle seçiniz...</option>';
            editNeighborhoodSelect.disabled = true;
        }
        
        if (editBuildingName) editBuildingName.value = '';
        if (editBuildingNumber) editBuildingNumber.value = '';
        if (editApartment) editApartment.value = '';
        if (editFloor) editFloor.value = '';
    }

    // saveCustomers fonksiyonu Firebase entegrasyonu ile kaldırıldı

    // Loading state yönetimi
    showLoadingState() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>İşlem yapılıyor...</p>
            </div>
        `;
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        document.body.appendChild(loadingOverlay);
    }

    hideLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    // Sipariş yönetimi
    switchCategory(category) {
        // Modern kategori butonlarını güncelle
        document.querySelectorAll('.modern-category-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.modern-category-tab[data-category="${category}"]`).classList.add('active');
        
        // Modern ürün gruplarını göster/gizle
        document.querySelectorAll('.modern-product-group').forEach(group => {
            group.style.display = group.dataset.category === category ? 'grid' : 'none';
        });
        
        // Sipariş özetini güncelle
        this.updateOrderSummary();
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
        this.updateOrderSummary();
    }

    updateProductCount(productName) {
        const countElement = document.getElementById(`count-${productName}`);
        const cartItem = this.cart.find(item => item.name === productName);
        
        if (countElement) {
            if (cartItem && cartItem.quantity > 0) {
                countElement.textContent = cartItem.quantity;
                countElement.style.display = 'flex';
            } else {
                countElement.textContent = '0';
                countElement.style.display = 'none';
            }
        }
    }
    
    updateOrderSummary() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const totalItemsElement = document.querySelector('.total-items');
        const totalPriceElement = document.querySelector('.total-price');
        
        if (totalItemsElement) {
            totalItemsElement.textContent = `${totalItems} Ürün`;
        }
        
        if (totalPriceElement) {
            totalPriceElement.textContent = `${totalPrice}₺`;
        }

        // Modern sepet sayısını güncelle
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = totalItems;
        }

        // Modern sepet özetini güncelle
        const subtotalElement = document.querySelector('#subtotalAmount');
        const totalElement = document.querySelector('#totalAmount');
        
        if (subtotalElement) {
            subtotalElement.textContent = totalPrice + '₺ toplam ücret';
        }
        
        if (totalElement) {
            totalElement.textContent = totalPrice + '₺ toplam ücret';
        }

        // Sipariş butonunu aktif/pasif yap
        const orderBtn = document.querySelector('.modern-order-btn, .order-btn');
        if (orderBtn) {
            orderBtn.disabled = totalItems === 0;
        }

        // Boş sepet durumunu kontrol et
        const emptyCart = document.querySelector('.modern-empty-cart');
        const cartItemsContainer = document.querySelector('.modern-cart-items');
        
        if (emptyCart && cartItemsContainer) {
            if (totalItems === 0) {
                emptyCart.style.display = 'block';
            } else {
                emptyCart.style.display = 'none';
            }
        }
    }

    updateCartDisplay() {
        // Legacy sepet güncellemesi
        const cartItems = document.getElementById('cartItems');
        const totalAmount = document.getElementById('totalAmount');
        const orderBtn = document.getElementById('completeOrderBtn');
        
        // Modern sepet güncellemesi
        const modernCartItems = document.querySelector('.modern-cart-items');
        const modernOrderBtn = document.querySelector('.modern-order-btn');
        
        if (this.cart.length === 0) {
            // Legacy sepet boş durumu
            if (cartItems) {
                cartItems.innerHTML = `
                    <div class="empty-cart">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Sepet boş</p>
                    </div>
                `;
            }
            
            // Modern sepet boş durumu
            if (modernCartItems) {
                modernCartItems.innerHTML = '';
            }
            
            if (totalAmount) totalAmount.textContent = '0₺';
            if (orderBtn) orderBtn.disabled = true;
            if (modernOrderBtn) modernOrderBtn.disabled = true;
        } else {
            // Legacy sepet dolu durumu
            if (cartItems) {
                cartItems.innerHTML = this.cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${(window.productNameMap && window.productNameMap[item.name]) || item.name}</div>
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
            }
            
            // Modern sepet dolu durumu
            if (modernCartItems) {
                modernCartItems.innerHTML = this.cart.map(item => {
                    const itemTotal = item.price * item.quantity;
                    return `
                    <div class="modern-cart-item">
                        <div class="modern-cart-item-info">
                            <div class="modern-cart-item-name">${(window.productNameMap && window.productNameMap[item.name]) || item.name}</div>
                            <div class="modern-cart-item-details">
                                <span class="modern-cart-item-unit-price">Birim: ${item.price}₺</span>
                                <span class="modern-cart-item-total-price">Toplam: ${itemTotal}₺</span>
                            </div>
                        </div>
                        <div class="modern-cart-item-quantity">
                            <button class="quantity-btn minus" onclick="dashboard.changeQuantity('${item.name}', -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="modern-quantity-display">${item.quantity}</span>
                            <button class="quantity-btn plus" onclick="dashboard.changeQuantity('${item.name}', 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                `;
                }).join('');
            }
            
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            if (totalAmount) totalAmount.textContent = `${total}₺ toplam ücret`;
            if (orderBtn) orderBtn.disabled = false;
            if (modernOrderBtn) modernOrderBtn.disabled = false;
        }
    }

    changeQuantity(productName, change) {
        const item = this.cart.find(item => item.name === productName);
        
        if (item) {
            item.quantity += change;
            
            if (item.quantity <= 0) {
                this.cart = this.cart.filter(cartItem => cartItem.name !== productName);
            }
            
            this.updateProductCount(productName);
            this.updateCartDisplay();
            this.updateOrderSummary();
        }
    }

    clearCart() {
        this.cart = [];
        
        // Tüm ürün sayaçlarını sıfırla
        document.querySelectorAll('.product-quantity').forEach(count => {
            count.textContent = '0';
            count.style.display = 'none';
        });
        
        // Modern sepet öğelerini temizle
        const modernCartItems = document.querySelector('.modern-cart-items');
        if (modernCartItems) {
            modernCartItems.innerHTML = '';
        }

        // Legacy sepet öğelerini temizle
        const cartItems = document.querySelector('.cart-items');
        if (cartItems) {
            cartItems.innerHTML = '';
        }
        
        this.updateCartDisplay();
        this.updateOrderSummary();
        this.showNotification('Sepet temizlendi', '');
    }

    async completeOrder() {
        if (this.cart.length === 0 || !this.currentCustomer) return;
        
        // currentCall kontrolü ekle
        if (!this.currentCall || !this.currentCall.number) {
            this.showNotification('Hata', 'Geçerli bir arama bulunamadı.', 'error');
            return;
        }
        
        try {
            // Loading göster
            this.showLoadingState();
            
            const orderData = {
                items: this.cart.map(item => ({
                    productName: item.name,
                    quantity: item.quantity,
                    unit: item.unit || 'adet',
                    unitPrice: item.price,
                    productId: item.id || null
                })),
                total: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                phone: this.currentCall.number,
                status: 'pending',
                notes: ''
            };
            
            // Firebase'e sipariş kaydet
            const result = await customerManager.addCustomerOrder(this.currentCustomer.id, orderData);
            
            if (result.success) {
                // Yerel depolama için de kaydet (eski sistem uyumluluğu)
                const order = {
                    id: result.orderId,
                    customer: this.currentCustomer,
                    items: [...this.cart],
                    total: orderData.total,
                    date: new Date().toISOString(),
                    phone: this.currentCall ? this.currentCall.number : 'Bilinmiyor'
                };
                
                const orders = JSON.parse(localStorage.getItem('orders')) || [];
                orders.push(order);
                localStorage.setItem('orders', JSON.stringify(orders));
                
                // Sepeti temizle
                this.clearCart();
                
                // Arama geçmişine ekle
                this.addToCallHistory();
                
                this.showNotification('Sipariş tamamlandı', `Toplam: ${orderData.total}₺`, 'success');
                
                // Arama sonlandır
                this.endCall();
            } else {
                this.showNotification('Hata', `Sipariş kaydedilemedi: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Sipariş tamamlama hatası:', error);
            this.showNotification('Hata', 'Sipariş kaydedilirken bir hata oluştu.', 'error');
        } finally {
            this.hideLoadingState();
        }
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
                        <h4>${call.caller?.name || 'Bilinmeyen'}</h4>
                        <p>${call.caller?.number || call.number || 'Numara yok'}</p>
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
        // Ürün ekleme sayfasına yönlendir
        window.location.href = './screen/addProduct.html';
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
        if (confirm('Uygulamayı sıfırlamak istediğinizden emin misiniz? Tüm veriler silinecektir ve kurulum ekranına yönlendirileceksiniz.')) {
            // Uygulama verilerini temizle
            this.callHistory = [];
            this.blockedNumbers = [];
            this.currentCall = null;
            this.isOnline = false;
            
            // Tüm localStorage verilerini temizle
            localStorage.removeItem('jetarayan-data');
            localStorage.removeItem('jetArayanSetupComplete');
            localStorage.removeItem('jetArayanSetup');
            localStorage.removeItem('customers');
            
            // Kurulum ekranına yönlendir
            window.location.href = './onboarding/arayanOnboarding.html';
        }
    }

    // Kurulum kontrolü
    checkSetupComplete() {
        const setupComplete = localStorage.getItem('jetArayanSetupComplete');
        const setupData = localStorage.getItem('jetArayanSetup');
        
        return setupComplete === 'true' && setupData;
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
    
    .loading-spinner {
        text-align: center;
        color: white;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Global variables
window.dashboard = null;
window.customerManager = customerManager;

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