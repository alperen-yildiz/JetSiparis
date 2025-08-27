// JetArayan Onboarding JavaScript
import { validateLicenseKey, saveLicenseData, getErrorMessage } from './license-validation.js';

// DOM Elements
const licenseForm = document.getElementById('licenseForm');
const restaurantForm = document.getElementById('restaurantForm');
const licenseKeyInput = document.getElementById('licenseKey');
const restaurantNameInput = document.getElementById('restaurantName');
const licenseStatus = document.getElementById('licenseStatus');
const validateLicenseBtn = document.getElementById('validateLicense');
const backToStep1Btn = document.getElementById('backToStep1');
const completeSetupBtn = document.getElementById('completeSetup');
const goToDashboardBtn = document.getElementById('goToDashboard');

// Current step tracking
let currentStep = 1;

// Initialize onboarding
document.addEventListener('DOMContentLoaded', function() {
    initializeOnboarding();
    bindEventListeners();
});

/**
 * Initialize onboarding process
 */
function initializeOnboarding() {
    // Check if setup is already complete
    if (checkSetupComplete()) {
        window.location.href = '../arayanDashboard.html';
        return;
    }
    
    // Format license key input
    formatLicenseKeyInput();
    
    // Show first step
    showStep(1);
}

/**
 * Bind event listeners
 */
function bindEventListeners() {
    // License form submission
    licenseForm.addEventListener('submit', handleLicenseValidation);
    
    // Restaurant form submission
    restaurantForm.addEventListener('submit', handleRestaurantSubmission);
    
    // Navigation buttons
    backToStep1Btn.addEventListener('click', () => showStep(1));
    goToDashboardBtn.addEventListener('click', goToDashboard);
    
    // License key formatting
    licenseKeyInput.addEventListener('input', formatLicenseKey);
    
    // Restaurant name validation
    restaurantNameInput.addEventListener('input', validateRestaurantName);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

/**
 * Handle license validation
 */
async function handleLicenseValidation(e) {
    e.preventDefault();
    
    const licenseKey = licenseKeyInput.value.trim();
    
    if (!licenseKey || licenseKey.length < 6) {
        showNotification('Geçerli bir lisans anahtarı girin (TCNOWL formatı)', 'error');
        return;
    }
    
    // Show loading state
    validateLicenseBtn.disabled = true;
    validateLicenseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Doğrulanıyor...';
    updateLicenseStatus('checking');
    
    try {
        // Firebase'den lisans doğrulama
        const result = await validateLicenseKey(licenseKey);
        
        if (result.success) {
            // Lisans geçerli
            updateLicenseStatus('valid');
            saveLicenseData(result.data);
            
            // Plan türüne göre mesaj göster
            const planMessage = result.data.isUnlimited 
                ? 'Sınırsız plan aktif!' 
                : `Yıllık plan aktif! Bitiş: ${formatDate(result.data.expiryDate)}`;
            
            showNotification(`Lisans başarıyla doğrulandı! ${planMessage}`, 'success');
            
            setTimeout(() => {
                showStep(2);
            }, 1500);
        } else {
            // Lisans geçersiz
            updateLicenseStatus('invalid');
            const errorMessage = getErrorMessage(result.code);
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Lisans doğrulama hatası:', error);
        updateLicenseStatus('invalid');
        showNotification('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.', 'error');
    }
    
    // Reset button state
    validateLicenseBtn.disabled = false;
    validateLicenseBtn.innerHTML = '<i class="fas fa-check"></i> Lisansı Doğrula';
}

/**
 * Handle restaurant form submission
 */
function handleRestaurantSubmission(e) {
    e.preventDefault();
    
    const restaurantName = restaurantNameInput.value.trim();
    
    if (!restaurantName || restaurantName.length < 2) {
        showNotification('Geçerli bir restoran adı girin', 'error');
        return;
    }
    
    // Show loading state
    completeSetupBtn.disabled = true;
    completeSetupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
    
    // Save setup data
    setTimeout(() => {
        saveSetupData({
            licenseKey: licenseKeyInput.value,
            restaurantName: restaurantName
        });
        
        showNotification('Kurulum başarıyla tamamlandı!', 'success');
        
        setTimeout(() => {
            showStep('success');
            
            // Auto redirect after 2 seconds
            setTimeout(() => {
                window.location.href = '../arayanDashboard.html';
            }, 2000);
        }, 1000);
    }, 1500);
}

/**
 * Validate license key format (client-side validation)
 */
function validateLicenseFormat(licenseKey) {
    // TCNOWL formatı: 6 harf, sadece A-Z
    const validFormat = /^[A-Z]{6}$/;
    return validFormat.test(licenseKey);
}

/**
 * Update license status display
 */
function updateLicenseStatus(status) {
    const statusElement = licenseStatus;
    const icon = statusElement.querySelector('i');
    const text = statusElement.querySelector('span');
    
    statusElement.className = `license-status ${status}`;
    
    switch (status) {
        case 'valid':
            icon.className = 'fas fa-check-circle';
            text.textContent = 'Lisans doğrulandı';
            break;
        case 'invalid':
            icon.className = 'fas fa-times-circle';
            text.textContent = 'Geçersiz lisans';
            break;
        case 'checking':
            icon.className = 'fas fa-spinner fa-spin';
            text.textContent = 'Doğrulanıyor...';
            break;
        default:
            icon.className = 'fas fa-circle';
            text.textContent = 'Doğrulama bekleniyor';
    }
}

/**
 * Format license key input
 */
function formatLicenseKeyInput() {
    licenseKeyInput.addEventListener('input', formatLicenseKey);
}

/**
 * Format license key for TCNOWL format
 */
function formatLicenseKey(e) {
    // Sadece harflere izin ver ve büyük harfe çevir
    let value = e.target.value.replace(/[^A-Z]/gi, '').toUpperCase();
    
    // Maksimum 6 karakter
    if (value.length > 6) {
        value = value.substring(0, 6);
    }
    
    e.target.value = value;
}

/**
 * Validate restaurant name
 */
function validateRestaurantName() {
    const name = restaurantNameInput.value.trim();
    const isValid = name.length >= 2;
    
    completeSetupBtn.disabled = !isValid;
    
    if (name.length > 0 && !isValid) {
        restaurantNameInput.classList.add('error');
    } else {
        restaurantNameInput.classList.remove('error');
    }
}

/**
 * Show specific step
 */
function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    const targetStep = stepNumber === 'success' ? 
        document.getElementById('successStep') : 
        document.getElementById(`step${stepNumber}`);
    
    if (targetStep) {
        targetStep.classList.add('active');
        currentStep = stepNumber;
        updateSidebarSteps(stepNumber);
    }
}

/**
 * Update sidebar step indicators
 */
function updateSidebarSteps(activeStep) {
    const steps = document.querySelectorAll('.sidebar .step');
    
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        const stepIndicator = step.querySelector('.step-indicator');
        const stepStatus = step.querySelector('.step-status');
        
        // Remove all classes
        step.classList.remove('active', 'completed');
        
        if (stepNumber < activeStep || (activeStep === 'success' && stepNumber <= 2)) {
            step.classList.add('completed');
            stepIndicator.innerHTML = '<i class="fas fa-check"></i>';
            if (stepStatus) stepStatus.textContent = 'TAMAMLANDI';
        } else if (stepNumber === activeStep) {
            step.classList.add('active');
            stepIndicator.innerHTML = `<span class="step-number">${stepNumber}</span>`;
            if (stepStatus) stepStatus.textContent = 'AKTİF';
        } else {
            stepIndicator.innerHTML = `<span class="step-number">${stepNumber}</span>`;
            if (stepStatus) stepStatus.textContent = '';
        }
    });
}

/**
 * Save setup data to localStorage
 */
function saveSetupData(data) {
    const setupData = {
        licenseKey: data.licenseKey,
        restaurantName: data.restaurantName,
        setupDate: new Date().toISOString(),
        version: '1.0.0'
    };
    
    // Save to localStorage
    localStorage.setItem('jetArayanSetup', JSON.stringify(setupData));
    localStorage.setItem('jetArayanSetupComplete', 'true');
}

/**
 * Check if setup is complete
 */
function checkSetupComplete() {
    const setupComplete = localStorage.getItem('jetArayanSetupComplete');
    const setupData = localStorage.getItem('jetArayanSetup');
    
    return setupComplete === 'true' && setupData;
}

/**
 * Go to dashboard
 */
function goToDashboard() {
    window.location.href = '../arayanDashboard.html';
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        // Ctrl+Enter to proceed to next step
        if (currentStep === 1 && !validateLicenseBtn.disabled) {
            licenseForm.dispatchEvent(new Event('submit'));
        } else if (currentStep === 2 && !completeSetupBtn.disabled) {
            restaurantForm.dispatchEvent(new Event('submit'));
        }
    } else if (e.key === 'Escape') {
        // Escape to go back
        if (currentStep === 2) {
            showStep(1);
        }
    }
}

// Utility functions

/**
 * Format currency (Turkish Lira)
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount);
}

/**
 * Format date (Turkish locale)
 */
function formatDate(date) {
    return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}