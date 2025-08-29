// JetArayan Product Management System
import { 
    addDocument, 
    getDocument, 
    getDocuments, 
    updateDocument, 
    deleteDocument,
    listenToCollection 
} from './firebase-firestore.js';

// Global state
let currentLicenseKey = null; // Dinamik lisans anahtarı
let categories = [];
let products = [];
let selectedCategoryId = null;
let editingCategoryId = null;
let editingProductId = null;

// DOM elements - will be initialized after DOM is ready
let elements = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initial setup
    initializeApp();
    
    // Additional safety check for Tauri - reinitialize after a short delay
    setTimeout(() => {
        if (Object.keys(elements).length === 0 || !elements.addCategoryBtn) {
            console.log('Reinitializing elements for Tauri compatibility');
            initializeElements();
            setupEventListeners();
        }
    }, 100);
});

// Additional initialization for Tauri compatibility
window.addEventListener('load', () => {
    // Final safety check after window is fully loaded
    setTimeout(() => {
        if (!elements.addCategoryBtn || !elements.categoryModal) {
            console.log('Final reinitializing for Tauri');
            initializeElements();
            setupEventListeners();
        }
    }, 200);
});

function initializeApp() {
    // Initialize DOM elements after DOM is ready
    initializeElements();
    setupEventListeners();
    
    // Doğrudan veri yükleme işlemini başlat
    loadData();
}

function initializeElements() {
    elements = {
        // Management elements
        addCategoryBtn: document.getElementById('addCategoryBtn'),
        addProductBtn: document.getElementById('addProductBtn'),
        refreshBtn: document.getElementById('refreshBtn'),
        categoriesList: document.getElementById('categoriesList'),
        productsList: document.getElementById('productsList'),
        categoryCount: document.getElementById('categoryCount'),
        productCount: document.getElementById('productCount'),
        categoryFilter: document.getElementById('categoryFilter'),
        
        // Category modal elements
        categoryModal: document.getElementById('categoryModal'),
        categoryForm: document.getElementById('categoryForm'),
        categoryModalTitle: document.getElementById('categoryModalTitle'),
        categoryName: document.getElementById('categoryName'),
        categoryDescription: document.getElementById('categoryDescription'),
        categoryColor: document.getElementById('categoryColor'),
        closeCategoryModal: document.getElementById('closeCategoryModal'),
        cancelCategoryBtn: document.getElementById('cancelCategoryBtn'),
        categorySaveText: document.getElementById('categorySaveText'),
        
        // Product modal elements
        productModal: document.getElementById('productModal'),
        productForm: document.getElementById('productForm'),
        productModalTitle: document.getElementById('productModalTitle'),
        productName: document.getElementById('productName'),
        productCategory: document.getElementById('productCategory'),
        productPrice: document.getElementById('productPrice'),
        productDescription: document.getElementById('productDescription'),
        closeProductModal: document.getElementById('closeProductModal'),
        cancelProductBtn: document.getElementById('cancelProductBtn'),
        productSaveText: document.getElementById('productSaveText'),
        
        // Utility elements
        loadingOverlay: document.getElementById('loadingOverlay'),
        toastContainer: document.getElementById('toastContainer')
    };
}

function setupEventListeners() {
    // Helper function to safely add event listeners
    const safeAddEventListener = (element, event, handler) => {
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn('Element not found for event listener:', element);
        }
    };
    
    // Management buttons
    safeAddEventListener(elements.addCategoryBtn, 'click', () => openCategoryModal());
    safeAddEventListener(elements.addProductBtn, 'click', () => openProductModal());
    safeAddEventListener(elements.refreshBtn, 'click', refreshData);
    
    // Category modal
    safeAddEventListener(elements.closeCategoryModal, 'click', closeCategoryModal);
    safeAddEventListener(elements.cancelCategoryBtn, 'click', closeCategoryModal);
    safeAddEventListener(elements.categoryForm, 'submit', handleCategorySubmit);
    safeAddEventListener(elements.categoryColor, 'input', updateColorPreview);
    
    // Product modal
    safeAddEventListener(elements.closeProductModal, 'click', closeProductModal);
    safeAddEventListener(elements.cancelProductBtn, 'click', closeProductModal);
    safeAddEventListener(elements.productForm, 'submit', handleProductSubmit);
    
    // Category filter
    safeAddEventListener(elements.categoryFilter, 'change', filterProducts);
    
    // Modal backdrop clicks
    safeAddEventListener(elements.categoryModal, 'click', (e) => {
        if (e.target === elements.categoryModal) {
            closeCategoryModal();
        }
    });
    
    safeAddEventListener(elements.productModal, 'click', (e) => {
        if (e.target === elements.productModal) {
            closeProductModal();
        }
    });
}



// Data Management
async function loadLicenseKey() {
    try {
        const result = await getDocuments('keys', {
            orderBy: { field: 'createdAt', direction: 'desc' },
            limit: 1
        });
        
        if (result.success && result.data.length > 0) {
            currentLicenseKey = result.data[0].id;
            console.log('License key loaded:', currentLicenseKey);
        } else {
            // Eğer hiç key yoksa, varsayılan bir key oluştur
            const newKeyResult = await addDocument('keys', {
                name: 'Default License',
                createdAt: new Date().toISOString(),
                isActive: true
            });
            
            if (newKeyResult.success) {
                currentLicenseKey = newKeyResult.id;
                console.log('New license key created:', currentLicenseKey);
            } else {
                throw new Error('License key oluşturulamadı');
            }
        }
    } catch (error) {
        console.error('Error loading license key:', error);
        showToast('Hata', 'Lisans anahtarı yüklenirken bir hata oluştu.', 'error');
        throw error;
    }
}

async function loadData() {
    showLoading(true);
    
    try {
        // Önce lisans anahtarını yükle
        if (!currentLicenseKey) {
            await loadLicenseKey();
        }
        
        // Önce kategorileri yükle, sonra ürünleri yükle
        await loadCategories();
        await loadProducts();
        
        updateUI();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Hata', 'Veriler yüklenirken bir hata oluştu.', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadCategories() {
    const result = await getDocuments(`keys/${currentLicenseKey}/categories`, {
        orderBy: { field: 'createdAt', direction: 'desc' }
    });
    
    if (result.success) {
        categories = result.data;
    } else {
        categories = [];
        console.error('Error loading categories:', result.error);
    }
}

async function loadProducts() {
    // Ürünleri tüm kategorilerden topla
    let allProducts = [];
    
    for (const category of categories) {
        const result = await getDocuments(`keys/${currentLicenseKey}/categories/${category.id}/products`, {
            orderBy: { field: 'createdAt', direction: 'desc' }
        });
        
        if (result.success) {
            // Her ürüne kategori bilgisini ekle
            const productsWithCategory = result.data.map(product => ({
                ...product,
                categoryId: category.id,
                categoryName: category.name
            }));
            allProducts = [...allProducts, ...productsWithCategory];
        }
    }
    
    // Ürünleri tarihe göre sırala
    products = allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Kategorileri güncelle (ürün sayıları ile birlikte)
    renderCategories();
}

async function refreshData() {
    showToast('Bilgi', 'Veriler yenileniyor...', 'info');
    await loadData();
    showToast('Başarılı', 'Veriler başarıyla yenilendi.', 'success');
}

// UI Updates
function updateUI() {
    renderCategories();
    renderProducts();
    updateCategoryFilter();
    updateCounts();
}

function renderCategories() {
    if (categories.length === 0) {
        elements.categoriesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Henüz kategori eklenmemiş</p>
                <small>Yeni kategori eklemek için yukarıdaki butonu kullanın</small>
            </div>
        `;
        return;
    }
    
    elements.categoriesList.innerHTML = categories.map(category => {
        const productCount = products.filter(product => product.categoryId === category.id).length;
        
        return `
        <div class="category-item ${selectedCategoryId === category.id ? 'active' : ''}" 
             onclick="selectCategory('${category.id}')">
            <div class="category-info">
                <div class="category-color" style="background-color: ${category.color}"></div>
                <div class="category-details">
                    <h4>${escapeHtml(category.name)}</h4>
                    <p>${escapeHtml(category.description || 'Açıklama yok')}</p>
                    <small class="product-count">${productCount} ürün</small>
                </div>
            </div>
            <div class="category-actions">
                <button class="action-icon" onclick="event.stopPropagation(); editCategory('${category.id}')" title="Düzenle">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-icon danger" onclick="event.stopPropagation(); deleteCategory('${category.id}')" title="Sil">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

function renderProducts() {
    let filteredProducts = products;
    
    if (selectedCategoryId) {
        filteredProducts = products.filter(product => product.categoryId === selectedCategoryId);
    }
    
    if (filteredProducts.length === 0) {
        const message = selectedCategoryId 
            ? 'Bu kategoride henüz ürün yok'
            : 'Henüz ürün eklenmemiş';
        const subMessage = selectedCategoryId 
            ? 'Bu kategoriye ürün eklemek için "Yeni Ürün" butonunu kullanın'
            : 'Önce bir kategori seçin, sonra ürün ekleyin';
            
        elements.productsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>${message}</p>
                <small>${subMessage}</small>
            </div>
        `;
        return;
    }
    
    elements.productsList.innerHTML = filteredProducts.map(product => {
        const category = categories.find(cat => cat.id === product.categoryId);
        return `
            <div class="product-item">
                <div class="product-image">
                    <i class="fas fa-box"></i>
                </div>
                <div class="product-info">
                    <h4>${escapeHtml(product.name)}</h4>
                    <div class="product-meta">
                        <span><i class="fas fa-folder"></i> ${escapeHtml(category?.name || 'Kategori Yok')}</span>
                    </div>
                    <div class="product-price">${formatPrice(product.price)}</div>
                </div>
                <div class="product-actions">
                    <button class="action-icon" onclick="editProduct('${product.id}')" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon danger" onclick="deleteProduct('${product.id}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateCategoryFilter() {
    const currentValue = elements.categoryFilter.value;
    
    elements.categoryFilter.innerHTML = `
        <option value="">Tüm Kategoriler</option>
        ${categories.map(category => 
            `<option value="${category.id}" ${currentValue === category.id ? 'selected' : ''}>
                ${escapeHtml(category.name)}
            </option>`
        ).join('')}
    `;
}

function updateCounts() {
    elements.categoryCount.textContent = categories.length;
    
    const filteredProducts = selectedCategoryId 
        ? products.filter(product => product.categoryId === selectedCategoryId)
        : products;
    elements.productCount.textContent = filteredProducts.length;
}

function selectCategory(categoryId) {
    selectedCategoryId = selectedCategoryId === categoryId ? null : categoryId;
    renderCategories();
    renderProducts();
    updateCounts();
}

function filterProducts() {
    selectedCategoryId = elements.categoryFilter.value || null;
    renderCategories();
    renderProducts();
    updateCounts();
}

// Category Management
function openCategoryModal(categoryId = null) {
    // Check if modal elements are available
    if (!elements.categoryModal) {
        console.error('Category modal element not found');
        showToast('Hata', 'Modal açılamadı. Sayfa yeniden yüklenecek.', 'error');
        setTimeout(() => window.location.reload(), 1500);
        return;
    }
    
    editingCategoryId = categoryId;
    
    if (categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
            if (elements.categoryModalTitle) elements.categoryModalTitle.textContent = 'Kategori Düzenle';
            if (elements.categoryName) elements.categoryName.value = category.name;
            if (elements.categoryDescription) elements.categoryDescription.value = category.description || '';
            if (elements.categoryColor) elements.categoryColor.value = category.color;
            if (elements.categorySaveText) elements.categorySaveText.textContent = 'Güncelle';
        }
    } else {
        if (elements.categoryModalTitle) elements.categoryModalTitle.textContent = 'Yeni Kategori Ekle';
        if (elements.categoryForm) elements.categoryForm.reset();
        if (elements.categoryColor) elements.categoryColor.value = '#2563eb';
        if (elements.categorySaveText) elements.categorySaveText.textContent = 'Kaydet';
    }
    
    updateColorPreview();
    elements.categoryModal.classList.add('show');
    if (elements.categoryName) elements.categoryName.focus();
}

function closeCategoryModal() {
    if (elements.categoryModal) {
        elements.categoryModal.classList.remove('show');
    }
    editingCategoryId = null;
    if (elements.categoryForm) {
        elements.categoryForm.reset();
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(elements.categoryForm);
    const categoryData = {
        name: formData.get('categoryName').trim(),
        description: formData.get('categoryDescription').trim(),
        color: formData.get('categoryColor')
    };
    
    if (!categoryData.name) {
        showToast('Hata', 'Kategori adı gereklidir.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        if (editingCategoryId) {
            // Update existing category
            const result = await updateDocument(
                `keys/${currentLicenseKey}/categories`,
                editingCategoryId,
                categoryData
            );
            
            if (result.success) {
                showToast('Başarılı', 'Kategori başarıyla güncellendi.', 'success');
                closeCategoryModal();
                await loadData();
            } else {
                showToast('Hata', 'Kategori güncellenirken bir hata oluştu.', 'error');
            }
        } else {
            // Create new category
            const result = await addDocument(
                `keys/${currentLicenseKey}/categories`,
                categoryData
            );
            
            if (result.success) {
                showToast('Başarılı', 'Kategori başarıyla eklendi.', 'success');
                closeCategoryModal();
                await loadData();
            } else {
                showToast('Hata', 'Kategori eklenirken bir hata oluştu.', 'error');
            }
        }
    } catch (error) {
        console.error('Category save error:', error);
        showToast('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
        showLoading(false);
    }
}

function editCategory(categoryId) {
    openCategoryModal(categoryId);
}

async function deleteCategory(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    // Check if category has products
    const categoryProducts = products.filter(product => product.categoryId === categoryId);
    if (categoryProducts.length > 0) {
        showToast('Uyarı', 'Bu kategoride ürünler bulunuyor. Önce ürünleri silin veya başka kategoriye taşıyın.', 'warning');
        return;
    }
    
    if (!confirm(`"${category.name}" kategorisini silmek istediğinizden emin misiniz?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await deleteDocument(
            `keys/${currentLicenseKey}/categories`,
            categoryId
        );
        
        if (result.success) {
            showToast('Başarılı', 'Kategori başarıyla silindi.', 'success');
            if (selectedCategoryId === categoryId) {
                selectedCategoryId = null;
            }
            await loadData();
        } else {
            showToast('Hata', 'Kategori silinirken bir hata oluştu.', 'error');
        }
    } catch (error) {
        console.error('Category delete error:', error);
        showToast('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
        showLoading(false);
    }
}

// Product Management
function openProductModal(productId = null) {
    if (categories.length === 0) {
        showToast('Uyarı', 'Ürün eklemek için önce en az bir kategori oluşturun.', 'warning');
        return;
    }
    
    editingProductId = productId;
    
    // Update category options
    elements.productCategory.innerHTML = `
        <option value="">Kategori seçiniz...</option>
        ${categories.map(category => 
            `<option value="${category.id}">${escapeHtml(category.name)}</option>`
        ).join('')}
    `;
    
    if (productId) {
        const product = products.find(prod => prod.id === productId);
        if (product) {
            elements.productModalTitle.textContent = 'Ürün Düzenle';
            elements.productName.value = product.name;
            elements.productCategory.value = product.categoryId;
            elements.productPrice.value = product.price;
            elements.productDescription.value = product.description || '';
            elements.productSaveText.textContent = 'Güncelle';
        }
    } else {
        elements.productModalTitle.textContent = 'Yeni Ürün Ekle';
        elements.productForm.reset();
        elements.productSaveText.textContent = 'Kaydet';
        
        // Pre-select category if one is selected
        if (selectedCategoryId) {
            elements.productCategory.value = selectedCategoryId;
        }
    }
    
    elements.productModal.classList.add('show');
    elements.productName.focus();
}

function closeProductModal() {
    elements.productModal.classList.remove('show');
    editingProductId = null;
    elements.productForm.reset();
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(elements.productForm);
    const productData = {
        name: formData.get('productName').trim(),
        categoryId: formData.get('productCategory'),
        price: parseFloat(formData.get('productPrice')),
        description: formData.get('productDescription').trim()
    };
    
    // Validation
    if (!productData.name) {
        showToast('Hata', 'Ürün adı gereklidir.', 'error');
        return;
    }
    
    if (!productData.categoryId) {
        showToast('Hata', 'Kategori seçimi gereklidir.', 'error');
        return;
    }
    
    if (isNaN(productData.price) || productData.price < 0) {
        showToast('Hata', 'Geçerli bir fiyat giriniz.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        if (editingProductId) {
            // Update existing product
            // Mevcut ürünün kategori bilgisini al
            const currentProduct = products.find(p => p.id === editingProductId);
            const categoryId = currentProduct ? currentProduct.categoryId : productData.categoryId;
            
            const result = await updateDocument(
                `keys/${currentLicenseKey}/categories/${categoryId}/products`,
                editingProductId,
                productData
            );
            
            if (result.success) {
                showToast('Başarılı', 'Ürün başarıyla güncellendi.', 'success');
                closeProductModal();
                await loadData();
            } else {
                showToast('Hata', 'Ürün güncellenirken bir hata oluştu.', 'error');
            }
        } else {
            // Create new product
            const result = await addDocument(
                `keys/${currentLicenseKey}/categories/${productData.categoryId}/products`,
                productData
            );
            
            if (result.success) {
                showToast('Başarılı', 'Ürün başarıyla eklendi.', 'success');
                closeProductModal();
                await loadData();
            } else {
                showToast('Hata', 'Ürün eklenirken bir hata oluştu.', 'error');
            }
        }
    } catch (error) {
        console.error('Product save error:', error);
        showToast('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
        showLoading(false);
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

async function deleteProduct(productId) {
    const product = products.find(prod => prod.id === productId);
    if (!product) return;
    
    if (!confirm(`"${product.name}" ürününü silmek istediğinizden emin misiniz?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await deleteDocument(
            `keys/${currentLicenseKey}/categories/${product.categoryId}/products`,
            productId
        );
        
        if (result.success) {
            showToast('Başarılı', 'Ürün başarıyla silindi.', 'success');
            await loadData();
        } else {
            showToast('Hata', 'Ürün silinirken bir hata oluştu.', 'error');
        }
    } catch (error) {
        console.error('Product delete error:', error);
        showToast('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
        showLoading(false);
    }
}

// Utility Functions
function updateColorPreview() {
    if (!elements.categoryColor) return;
    
    const colorValue = elements.categoryColor.value;
    const preview = document.querySelector('.color-preview');
    if (preview) {
        preview.style.backgroundColor = colorValue;
    }
}

function showLoading(show) {
    if (!elements.loadingOverlay) return;
    
    if (show) {
        elements.loadingOverlay.classList.add('show');
    } else {
        elements.loadingOverlay.classList.remove('show');
    }
}

function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${iconMap[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPrice(price) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(price);
}

// Global functions for onclick handlers
window.selectCategory = selectCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

// Export for potential external use
export {
    loadData,
    refreshData,
    showToast
};