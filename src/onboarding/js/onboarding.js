// Modern Multi-Step Onboarding JavaScript
import { validateLicense, formatLicenseKey, getPlanDescription, formatSubscriptionDate } from './license-validator.js';

document.addEventListener('DOMContentLoaded', function() {
    // Current step tracking
    let currentStep = 1;
    let selectedPlatforms = [];
    let licenseValid = false;

    // Form elements
    const stepContents = document.querySelectorAll('.step-content');
    const sidebarSteps = document.querySelectorAll('.step');

    // Step 1 - License Validation
    const licenseForm = document.getElementById('licenseForm');
    const licenseKeyInput = document.getElementById('licenseKey');
    const licenseStatus = document.getElementById('licenseStatus');
    const validateLicenseBtn = document.getElementById('validateLicense');

    // Step 2 - Platform Selection
    const platformForm = document.getElementById('platformForm');
    const platformOptions = document.querySelectorAll('.platform-option');
    const platformCheckboxes = document.querySelectorAll('input[name="platforms"]');
    const continueToStep3Btn = document.getElementById('continueToStep3');
    const backToStep1Btn = document.getElementById('backToStep1');

    // Step 3 - API Configuration
    const apiForm = document.getElementById('apiForm');
    const apiConfigs = document.getElementById('apiConfigs');
    const backToStep2Btn = document.getElementById('backToStep2');
    const completeSetupBtn = document.getElementById('completeSetup');

    // Success step
    const goToDashboardBtn = document.getElementById('goToDashboard');

    // Initialize
    init();

    function init() {
        setupEventListeners();
        updateSidebarSteps();
        showStep(1);
    }

    function setupEventListeners() {
        // License validation
        if (licenseForm) {
            licenseForm.addEventListener('submit', handleLicenseValidation);
        }

        if (licenseKeyInput) {
            licenseKeyInput.addEventListener('input', formatLicenseKeyInput);
        }

        // Platform selection
        if (platformForm) {
            platformForm.addEventListener('submit', handlePlatformSelection);
        }

        platformCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handlePlatformChange);
        });

        platformOptions.forEach(option => {
            option.addEventListener('click', function() {
                const checkbox = this.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    handlePlatformChange.call(checkbox);
                }
            });
        });

        // API configuration
        if (apiForm) {
            apiForm.addEventListener('submit', handleApiConfiguration);
        }

        // Navigation buttons
        if (backToStep1Btn) {
            backToStep1Btn.addEventListener('click', () => showStep(1));
        }

        if (backToStep2Btn) {
            backToStep2Btn.addEventListener('click', () => showStep(2));
        }

        if (goToDashboardBtn) {
            goToDashboardBtn.addEventListener('click', () => {
                window.location.href = '../dashboard.html';
            });
        }
    }

    function formatLicenseKeyInput(e) {
        let value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        // Maksimum 6 karakter sınırı
        if (value.length > 6) {
            value = value.substring(0, 6);
        }
        
        e.target.value = value;
        
        // Lisans durumunu sıfırla
        if (licenseValid && e.target.value.length < 6) {
            licenseValid = false;
            updateLicenseStatus('', 'Doğrulama bekleniyor');
            validateLicenseBtn.innerHTML = '<i class="fas fa-check"></i> Lisansı Doğrula';
            validateLicenseBtn.disabled = false;
        }
    }

    async function handleLicenseValidation(e) {
        e.preventDefault();
        
        const licenseKey = licenseKeyInput.value.trim();
        
        if (licenseKey.length < 6) {
            updateLicenseStatus('invalid', 'Geçersiz lisans anahtarı formatı');
            return;
        }

        // Firebase Firestore ile lisans doğrulama
        updateLicenseStatus('validating', 'Lisans doğrulanıyor...');
        validateLicenseBtn.disabled = true;
        validateLicenseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Doğrulanıyor...';

        try {
            const result = await validateLicense(licenseKey);
            
            if (result.success) {
                licenseValid = true;
                const planDesc = getPlanDescription(result.data.planType);
                const subscriptionInfo = result.data.subscriptionEnd ? 
                    ` (${formatSubscriptionDate(result.data.subscriptionEnd)})` : '';
                
                updateLicenseStatus('valid', `Lisans geçerli - ${planDesc}${subscriptionInfo}`);
                validateLicenseBtn.innerHTML = '<i class="fas fa-check"></i> Doğrulandı';
                
                // Lisans bilgilerini localStorage'a kaydet
                localStorage.setItem('jetSiparisLicense', JSON.stringify(result.data));
                
                setTimeout(() => {
                    showStep(2);
                }, 1500);
            } else {
                licenseValid = false;
                let errorMessage = 'Lisans doğrulama başarısız';
                
                switch (result.code) {
                    case 'INVALID_KEY':
                        errorMessage = 'Geçersiz lisans anahtarı';
                        break;
                    case 'NOT_ORDERED':
                        errorMessage = 'Lisans henüz aktif değil';
                        break;
                    case 'EXPIRED':
                        errorMessage = `Lisans süresi dolmuş (${formatSubscriptionDate(result.expiredDate)})`;
                        break;
                    default:
                        errorMessage = result.error || 'Bilinmeyen hata';
                }
                
                updateLicenseStatus('invalid', errorMessage);
                validateLicenseBtn.innerHTML = '<i class="fas fa-times"></i> Doğrulama Başarısız';
            }
        } catch (error) {
            console.error('Lisans doğrulama hatası:', error);
            licenseValid = false;
            updateLicenseStatus('invalid', 'Bağlantı hatası. Lütfen tekrar deneyin.');
            validateLicenseBtn.innerHTML = '<i class="fas fa-times"></i> Hata';
        } finally {
            validateLicenseBtn.disabled = false;
            
            // 3 saniye sonra butonu sıfırla
            setTimeout(() => {
                if (!licenseValid) {
                    validateLicenseBtn.innerHTML = '<i class="fas fa-check"></i> Lisansı Doğrula';
                }
            }, 3000);
        }
    }

    function updateLicenseStatus(status, message) {
        licenseStatus.className = `license-status ${status}`;
        licenseStatus.querySelector('span').textContent = message;
        
        const icon = licenseStatus.querySelector('i');
        switch(status) {
            case 'validating':
                icon.className = 'fas fa-spinner fa-spin';
                break;
            case 'valid':
                icon.className = 'fas fa-check-circle';
                break;
            case 'invalid':
                icon.className = 'fas fa-times-circle';
                break;
            default:
                icon.className = 'fas fa-circle';
        }
    }

    function handlePlatformChange() {
        const platformCard = this.closest('.platform-option').querySelector('.platform-card');
        
        if (this.checked) {
            platformCard.classList.add('selected');
            selectedPlatforms.push(this.value);
        } else {
            platformCard.classList.remove('selected');
            selectedPlatforms = selectedPlatforms.filter(p => p !== this.value);
        }

        // Enable/disable continue button
        continueToStep3Btn.disabled = selectedPlatforms.length === 0;
    }

    function handlePlatformSelection(e) {
        e.preventDefault();
        
        if (selectedPlatforms.length === 0) {
            showNotification('Lütfen en az bir platform seçin', 'error');
            return;
        }

        generateApiConfigs();
        showStep(3);
    }

    function generateApiConfigs() {
        const platformData = {
            yemeksepeti: {
                name: 'Yemeksepeti',
                logo: 'https://jetsiparis.solosolf.com/img/Yemek-Sepeti.png'
            },
            migros: {
                name: 'Migros Yemek',
                logo: 'https://jetsiparis.solosolf.com/img/migros-yemek.webp'
            },
            trendyol: {
                name: 'Trendyol Yemek',
                logo: 'https://jetsiparis.solosolf.com/img/trendyol-yemek.webp'
            },
            getir: {
                name: 'Getir Yemek',
                logo: 'https://jetsiparis.solosolf.com/img/getir-yemek.png'
            }
        };

        apiConfigs.innerHTML = '';

        selectedPlatforms.forEach(platform => {
            const data = platformData[platform];
            if (!data) return;

            const configSection = document.createElement('div');
            configSection.className = 'api-config-section';
            configSection.innerHTML = `
                <div class="api-config-header">
                    <img src="${data.logo}" alt="${data.name}">
                    <h4>${data.name} API Konfigürasyonu</h4>
                </div>
                
                <div class="api-form-group">
                    <label for="${platform}_api_key">API Anahtarı</label>
                    <input type="password" id="${platform}_api_key" name="${platform}_api_key" placeholder="API anahtarınızı girin" required>
                </div>
                
                <div class="connection-status" id="${platform}_status">
                    <i class="fas fa-circle"></i>
                    <span>Bağlantı test edilmedi</span>
                </div>
            `;

            apiConfigs.appendChild(configSection);

            // Add test connection functionality
            const apiKeyInput = configSection.querySelector(`#${platform}_api_key`);
            
            apiKeyInput.addEventListener('blur', () => testConnection(platform));
        });
    }

    function testConnection(platform) {
        const apiKey = document.getElementById(`${platform}_api_key`).value;
        const statusElement = document.getElementById(`${platform}_status`);

        if (!apiKey) {
            return;
        }

        // Simulate connection test
        updateConnectionStatus(statusElement, 'testing', 'API anahtarı doğrulanıyor...');

        setTimeout(() => {
            // Simulate random success/failure
            const success = Math.random() > 0.3;
            
            if (success) {
                updateConnectionStatus(statusElement, 'connected', 'API anahtarı geçerli');
            } else {
                updateConnectionStatus(statusElement, 'failed', 'API anahtarı geçersiz');
            }
        }, 1500);
    }

    function updateConnectionStatus(element, status, message) {
        element.className = `connection-status ${status}`;
        element.querySelector('span').textContent = message;
        
        const icon = element.querySelector('i');
        switch(status) {
            case 'testing':
                icon.className = 'fas fa-spinner fa-spin';
                break;
            case 'connected':
                icon.className = 'fas fa-check-circle';
                break;
            case 'failed':
                icon.className = 'fas fa-times-circle';
                break;
            default:
                icon.className = 'fas fa-circle';
        }
    }

    function handleApiConfiguration(e) {
        e.preventDefault();
        
        // Validate all API configurations
        let allValid = true;
        
        selectedPlatforms.forEach(platform => {
            const apiKey = document.getElementById(`${platform}_api_key`).value;
            
            if (!apiKey) {
                allValid = false;
            }
        });

        if (!allValid) {
            showNotification('Lütfen tüm API anahtarlarını doldurun', 'error');
            return;
        }

        // Simulate setup completion
        completeSetupBtn.disabled = true;
        completeSetupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kurulum tamamlanıyor...';

        setTimeout(() => {
            // Kurulum verilerini localStorage'a kaydet
            saveSetupData();
            
            showStep('success');
            // Kurulum tamamlandıktan sonra dashboard'a yönlendir
            setTimeout(() => {
                window.location.href = '../dashboard.html';
            }, 2000);
        }, 2000);
    }

    function showStep(step) {
        // Hide all steps
        stepContents.forEach(content => {
            content.classList.remove('active');
        });

        // Show target step
        if (step === 'success') {
            document.getElementById('successStep').classList.add('active');
            currentStep = 4;
        } else {
            document.getElementById(`step${step}`).classList.add('active');
            currentStep = step;
        }

        updateSidebarSteps();
    }

    function updateSidebarSteps() {
        sidebarSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            const status = step.querySelector('.step-status');
            
            // Remove all classes
            step.classList.remove('active', 'completed');
            
            if (stepNumber < currentStep) {
                step.classList.add('completed');
                if (status) status.textContent = 'TAMAMLANDI';
            } else if (stepNumber === currentStep) {
                step.classList.add('active');
                if (status) status.textContent = 'AKTİF';
            } else {
                if (status) status.textContent = 'BEKLİYOR';
            }
        });
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;

        switch(type) {
            case 'success':
                notification.style.background = '#d1fae5';
                notification.style.color = '#065f46';
                notification.style.border = '1px solid #a7f3d0';
                break;
            case 'error':
                notification.style.background = '#fee2e2';
                notification.style.color = '#991b1b';
                notification.style.border = '1px solid #fecaca';
                break;
            default:
                notification.style.background = '#dbeafe';
                notification.style.color = '#1e40af';
                notification.style.border = '1px solid #93c5fd';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Add animation styles
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }

    // Kurulum verilerini localStorage'a kaydet
    function saveSetupData() {
        try {
            const licenseKey = document.getElementById('licenseKey').value;
            
            // API konfigürasyonlarını topla
            const apiConfigs = {};
            selectedPlatforms.forEach(platform => {
                const apiKey = document.getElementById(`${platform}_api_key`).value;
                if (apiKey) {
                    apiConfigs[platform] = {
                        apiKey: apiKey,
                        status: 'configured'
                    };
                }
            });
            
            const setupData = {
                license: licenseKey,
                platforms: selectedPlatforms,
                apiConfigs: apiConfigs,
                setupDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            // Kurulum verilerini kaydet
            localStorage.setItem('jetSiparisSetup', JSON.stringify(setupData));
            localStorage.setItem('jetSiparisSetupComplete', 'true');
            
            console.log('Kurulum verileri başarıyla kaydedildi:', setupData);
        } catch (error) {
            console.error('Kurulum verileri kaydedilirken hata oluştu:', error);
        }
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
            const form = e.target.closest('form');
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.click();
                }
            }
        }
    });
});

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        formatDate
    };
}