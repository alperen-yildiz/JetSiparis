// Şehir Yönetim Sistemi - Türkiye API Entegrasyonu
class CityManager {
    constructor() {
        this.apiBaseUrl = 'https://turkiyeapi.dev/api/v1';
        this.cities = [];
        this.districts = [];
        this.neighborhoods = [];
        this.selectedCity = null;
        this.selectedDistrict = null;
        
        this.init();
    }

    async init() {
        this.initializeDropdowns();
        await this.loadCities();
        this.bindEvents();
        this.loadSavedCity();
    }

    // Dropdown'ları başlangıçta disabled yap
    initializeDropdowns() {
        const districtSelect = document.getElementById('districtSelect');
        const neighborhoodSelect = document.getElementById('neighborhoodSelect');
        const editDistrictSelect = document.getElementById('editDistrictSelect');
        const editNeighborhoodSelect = document.getElementById('editNeighborhoodSelect');
        
        if (districtSelect) {
            districtSelect.disabled = true;
        }
        if (neighborhoodSelect) {
            neighborhoodSelect.disabled = true;
        }
        if (editDistrictSelect) {
            editDistrictSelect.disabled = true;
        }
        if (editNeighborhoodSelect) {
            editNeighborhoodSelect.disabled = true;
        }
    }

    // Türkiye'nin tüm şehirlerini yükle
    async loadCities() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/provinces`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                this.cities = data.data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
                this.populateCitySelect();
            }
        } catch (error) {
            console.error('Şehirler yüklenirken hata oluştu:', error);
            this.showError('Şehir verileri yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
        }
    }

    // Şehir dropdown'ını doldur
    populateCitySelect() {
        const citySelect = document.getElementById('citySelect');
        if (!citySelect) return;

        // Mevcut seçenekleri temizle (ilk seçenek hariç)
        citySelect.innerHTML = '<option value="">Şehir seçiniz...</option>';

        // Şehirleri ekle
        this.cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.id;
            option.textContent = city.name;
            citySelect.appendChild(option);
        });
    }

    // Seçilen şehrin ilçelerini yükle
    async loadDistricts(cityId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/provinces/${cityId}`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                this.districts = data.data.districts.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
                this.populateDistrictSelect();
            }
        } catch (error) {
            console.error('İlçeler yüklenirken hata oluştu:', error);
            this.showError('İlçe verileri yüklenemedi.');
        }
    }

    // İlçe dropdown'ını doldur
    populateDistrictSelect() {
        const districtSelect = document.getElementById('districtSelect');
        if (!districtSelect) return;

        // Mevcut seçenekleri temizle
        districtSelect.innerHTML = '<option value="">İlçe seçiniz...</option>';
        
        // Mahalle dropdown'ını da temizle
        this.clearNeighborhoodSelect();

        // İlçeleri ekle
        this.districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.id;
            option.textContent = district.name;
            districtSelect.appendChild(option);
        });

        // İlçe seçimini etkinleştir
        districtSelect.disabled = false;
    }

    // Seçilen ilçenin mahallelerini yükle
    async loadNeighborhoods(districtId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/districts/${districtId}`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                this.neighborhoods = data.data.neighborhoods.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
                this.populateNeighborhoodSelect();
            }
        } catch (error) {
            console.error('Mahalleler yüklenirken hata oluştu:', error);
            this.showError('Mahalle verileri yüklenemedi.');
        }
    }

    // Mahalle dropdown'ını doldur
    async populateNeighborhoodSelect(districtId = null) {
        const neighborhoodSelect = document.getElementById('neighborhoodSelect');
        if (!neighborhoodSelect) return;

        // Mevcut seçenekleri temizle
        neighborhoodSelect.innerHTML = '<option value="">Mahalle seçiniz...</option>';
        neighborhoodSelect.disabled = true;

        // Eğer districtId verilmişse, o ilçenin mahallelerini yükle
        if (districtId) {
            try {
                await this.loadNeighborhoods(districtId);
            } catch (error) {
                console.error('Mahalleler yüklenirken hata:', error);
                return;
            }
        }

        // Mahalleleri ekle
        this.neighborhoods.forEach(neighborhood => {
            const option = document.createElement('option');
            option.value = neighborhood.id;
            option.textContent = neighborhood.name;
            neighborhoodSelect.appendChild(option);
        });

        // Mahalle seçimini etkinleştir
        neighborhoodSelect.disabled = false;
    }

    // Mahalle dropdown'ını temizle
    clearNeighborhoodSelect() {
        const neighborhoodSelect = document.getElementById('neighborhoodSelect');
        if (neighborhoodSelect) {
            neighborhoodSelect.innerHTML = '<option value="">Mahalle seçiniz...</option>';
            neighborhoodSelect.disabled = true;
        }
    }

    // Event listener'ları bağla
    bindEvents() {
        // Şehir seçimi
        const citySelect = document.getElementById('citySelect');
        if (citySelect) {
            citySelect.addEventListener('change', (e) => {
                this.handleCityChange(e.target.value);
            });
        }

        // İlçe seçimi
        const districtSelect = document.getElementById('districtSelect');
        if (districtSelect) {
            districtSelect.addEventListener('change', (e) => {
                this.handleDistrictChange(e.target.value);
            });
        }
    }

    // Şehir değişikliğini işle
    async handleCityChange(cityId) {
        if (!cityId) {
            this.selectedCity = null;
            this.clearDistrictAndNeighborhood();
            this.updateCityDisplay('');
            this.saveCitySelection('');
            return;
        }

        // Seçilen şehri bul
        this.selectedCity = this.cities.find(city => city.id == cityId);
        
        if (this.selectedCity) {
            // Şehir görünümünü güncelle
            this.updateCityDisplay(this.selectedCity.name);
            
            // Şehir seçimini kaydet
            this.saveCitySelection(this.selectedCity.name);
            
            // İlçeleri yükle
            await this.loadDistricts(cityId);
        }
    }

    // İlçe değişikliğini işle
    async handleDistrictChange(districtId) {
        if (!districtId) {
            this.selectedDistrict = null;
            this.clearNeighborhoodSelect();
            return;
        }

        // Seçilen ilçeyi bul
        this.selectedDistrict = this.districts.find(district => district.id == districtId);
        
        if (this.selectedDistrict) {
            // Mahalleleri yükle
            await this.loadNeighborhoods(districtId);
        }
    }

    // İlçe ve mahalle dropdown'larını temizle
    clearDistrictAndNeighborhood() {
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

    // Şehir görünümünü güncelle
    updateCityDisplay(cityName) {
        // Settings modal'daki görünüm
        const selectedCityDisplay = document.getElementById('selectedCityDisplay');
        const selectedCityName = document.getElementById('selectedCityName');
        
        if (selectedCityDisplay && selectedCityName) {
            if (cityName) {
                selectedCityName.textContent = cityName;
                selectedCityDisplay.style.display = 'block';
            } else {
                selectedCityDisplay.style.display = 'none';
            }
        }

        // Form'daki görünüm
        const formSelectedCity = document.getElementById('formSelectedCity');
        if (formSelectedCity) {
            formSelectedCity.textContent = cityName || 'Ayarlardan şehir seçiniz';
        }
    }

    // Şehir seçimini kaydet
    saveCitySelection(cityName) {
        localStorage.setItem('selectedCity', cityName);
    }

    // Kaydedilen şehri yükle
    loadSavedCity() {
        const savedCity = localStorage.getItem('selectedCity');
        if (savedCity) {
            this.updateCityDisplay(savedCity);
            
            // Şehir dropdown'ında seçili hale getir
            const citySelect = document.getElementById('citySelect');
            if (citySelect) {
                const cityOption = Array.from(citySelect.options).find(option => 
                    option.textContent === savedCity
                );
                if (cityOption) {
                    citySelect.value = cityOption.value;
                    this.handleCityChange(cityOption.value);
                }
            }
        }
    }

    // Hata mesajı göster
    showError(message) {
        // Basit bir hata gösterimi - daha gelişmiş bir notification sistemi eklenebilir
        console.error(message);
        
        // Kullanıcıya görsel geri bildirim
        const citySelect = document.getElementById('citySelect');
        if (citySelect) {
            citySelect.style.borderColor = '#ef4444';
            setTimeout(() => {
                citySelect.style.borderColor = '#e2e8f0';
            }, 3000);
        }
    }

    // Seçilen şehir bilgisini al
    getSelectedCity() {
        return this.selectedCity ? this.selectedCity.name : null;
    }

    // Seçilen ilçe bilgisini al
    getSelectedDistrict() {
        return this.selectedDistrict;
    }

    // Tam adres bilgisini oluştur
    getFullAddress() {
        const formData = {
            city: this.selectedCity?.name || '',
            district: this.selectedDistrict?.name || '',
            neighborhood: document.getElementById('neighborhoodSelect')?.selectedOptions[0]?.textContent || '',
            buildingName: document.getElementById('buildingName')?.value || '',
            buildingNumber: document.getElementById('buildingNumber')?.value || '',
            apartment: document.getElementById('apartment')?.value || '',
            floor: document.getElementById('floor')?.value || ''
        };

        // Adres string'ini oluştur
        let addressParts = [];
        
        if (formData.buildingName) addressParts.push(formData.buildingName);
        if (formData.buildingNumber) addressParts.push(`No: ${formData.buildingNumber}`);
        if (formData.apartment) addressParts.push(`Daire: ${formData.apartment}`);
        if (formData.floor) addressParts.push(`Kat: ${formData.floor}`);
        if (formData.neighborhood) addressParts.push(formData.neighborhood);
        if (formData.district) addressParts.push(formData.district);
        if (formData.city) addressParts.push(formData.city);

        return {
            formatted: addressParts.join(', '),
            details: formData
        };
    }

    // Düzenleme formu için ilçe dropdown'ını doldur
    async populateEditDistrictSelect() {
        const editDistrictSelect = document.getElementById('editDistrictSelect');
        if (!editDistrictSelect || !this.selectedCity) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/provinces/${this.selectedCity.id}`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                const districts = data.data.districts.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
                
                editDistrictSelect.innerHTML = '<option value="">İlçe seçiniz...</option>';
                districts.forEach(district => {
                    const option = document.createElement('option');
                    option.value = district.id;
                    option.textContent = district.name;
                    editDistrictSelect.appendChild(option);
                });
                
                editDistrictSelect.disabled = false;
            }
        } catch (error) {
            console.error('İlçeler yüklenirken hata oluştu:', error);
            this.showError('İlçe verileri yüklenemedi.');
        }
    }

    // Düzenleme formu için mahalle dropdown'ını doldur
    async populateEditNeighborhoodSelect(districtId) {
        const editNeighborhoodSelect = document.getElementById('editNeighborhoodSelect');
        if (!editNeighborhoodSelect || !districtId) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/districts/${districtId}`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                const neighborhoods = data.data.neighborhoods.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
                
                editNeighborhoodSelect.innerHTML = '<option value="">Mahalle seçiniz...</option>';
                neighborhoods.forEach(neighborhood => {
                    const option = document.createElement('option');
                    option.value = neighborhood.id;
                    option.textContent = neighborhood.name;
                    editNeighborhoodSelect.appendChild(option);
                });
                
                editNeighborhoodSelect.disabled = false;
            }
        } catch (error) {
            console.error('Mahalleler yüklenirken hata oluştu:', error);
            this.showError('Mahalle verileri yüklenemedi.');
        }
    }
}

// Global instance oluştur
let cityManager;

// DOM yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    cityManager = new CityManager();
});