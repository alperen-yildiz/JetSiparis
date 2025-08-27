// Firebase Firestore veritabanı servisi
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "./firebase-config.js";

// Firestore instance'ını al
const db = getFirestore(app);

/**
 * Koleksiyona yeni doküman ekle
 * @param {string} collectionName - Koleksiyon adı
 * @param {Object} data - Eklenecek veri
 * @returns {Promise} - Ekleme sonucu
 */
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Doküman ID'si ile doküman al
 * @param {string} collectionName - Koleksiyon adı
 * @param {string} documentId - Doküman ID'si
 * @returns {Promise} - Doküman verisi
 */
export const getDocument = async (collectionName, documentId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: "Doküman bulunamadı" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Koleksiyondaki tüm dokümanları al
 * @param {string} collectionName - Koleksiyon adı
 * @param {Object} options - Sorgu seçenekleri (where, orderBy, limit)
 * @returns {Promise} - Doküman listesi
 */
export const getDocuments = async (collectionName, options = {}) => {
  try {
    let q = collection(db, collectionName);
    
    // Where koşulları ekle
    if (options.where) {
      options.where.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });
    }
    
    // Sıralama ekle
    if (options.orderBy) {
      q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
    }
    
    // Limit ekle
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const querySnapshot = await getDocs(q);
    const documents = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: documents };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Doküman güncelle
 * @param {string} collectionName - Koleksiyon adı
 * @param {string} documentId - Doküman ID'si
 * @param {Object} data - Güncellenecek veri
 * @returns {Promise} - Güncelleme sonucu
 */
export const updateDocument = async (collectionName, documentId, data) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Doküman sil
 * @param {string} collectionName - Koleksiyon adı
 * @param {string} documentId - Doküman ID'si
 * @returns {Promise} - Silme sonucu
 */
export const deleteDocument = async (collectionName, documentId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Koleksiyonu gerçek zamanlı dinle
 * @param {string} collectionName - Koleksiyon adı
 * @param {Function} callback - Değişiklik callback fonksiyonu
 * @param {Object} options - Sorgu seçenekleri
 * @returns {Function} - Unsubscribe fonksiyonu
 */
export const listenToCollection = (collectionName, callback, options = {}) => {
  let q = collection(db, collectionName);
  
  // Where koşulları ekle
  if (options.where) {
    options.where.forEach(condition => {
      q = query(q, where(condition.field, condition.operator, condition.value));
    });
  }
  
  // Sıralama ekle
  if (options.orderBy) {
    q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    callback(documents);
  });
};

/**
 * Dokümanı gerçek zamanlı dinle
 * @param {string} collectionName - Koleksiyon adı
 * @param {string} documentId - Doküman ID'si
 * @param {Function} callback - Değişiklik callback fonksiyonu
 * @returns {Function} - Unsubscribe fonksiyonu
 */
export const listenToDocument = (collectionName, documentId, callback) => {
  const docRef = doc(db, collectionName, documentId);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

// Firestore instance'ını export et
export { db };