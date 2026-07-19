// 🔥 Firebase Firestore Konfigürasyonu (db.js)
const firebaseConfig = {
    apiKey: "AIzaSyDjG5L5fWZ5qh6vplIeXjm-Ga1Da8Lp6eI",
    authDomain: "siparis-takip-b5806.firebaseapp.com",
    projectId: "siparis-takip-b5806",
    storageBucket: "siparis-takip-b5806.firebasestorage.app",
    messagingSenderId: "164470805717",
    appId: "1:164470805717:web:4bd334a3d042fc88923e5c"
};

// Firebase Başlatma
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 🚀 Ağ Engellerini ve 400 Hatalarını Aşmak İçin Özel Ayarlar (WebSockets yerine HTTP Long Polling)
db.settings({
    forceLongPolling: true,
    experimentalAutoDetectLongPolling: true,
    merge: true
});

// Çevrimdışı Çalışma Desteği (IndexedDB Önbelleği & Çoklu Sekme Eşitleme)
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Firestore Önbellek Hatası: Birden fazla sekme açık.");
    } else if (err.code == 'unimplemented') {
        console.warn("Firestore Önbellek Hatası: Tarayıcı desteklemiyor.");
    }
});

// 🌐 Veritabanı Durumunu Giriş Ekranı Altında Göster
window.addEventListener('DOMContentLoaded', () => {
    const footer = document.getElementById("db-status-footer");
    if (footer) {
        footer.innerHTML = `<i data-lucide="cloud" style="color:var(--accent-cyan); width:14px; height:14px; margin-right:4px;"></i> Bulut Veritabanı Aktif (Firebase)`;
        if (window.lucide) lucide.createIcons();
    }
});

const DBService = {
    // --- KULLANICILAR ---
    async getKullanicilar() {
        if (!db) return [];
        const snap = await db.collection("erp_kullanicilar").get();
        let list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 1. Mükerrer Kullanıcıları Veritabanından Otomatik Temizle (Tekilleştirme)
        const seen = new Set();
        const duplicates = [];
        list.forEach(u => {
            if (u.kullaniciAdi) {
                const key = u.kullaniciAdi.trim().toLowerCase();
                if (seen.has(key)) {
                    duplicates.push(u.id);
                } else {
                    seen.add(key);
                }
            }
        });

        if (duplicates.length > 0) {
            for (let dupId of duplicates) {
                await db.collection("erp_kullanicilar").doc(dupId).delete();
            }
            // Listeyi yeniden tazele
            const freshSnap = await db.collection("erp_kullanicilar").get();
            list = freshSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // 2. Eğer başlangıçta İsmail Yıldırım yoksa tohumla
        if (list.length === 0 || !list.some(u => u.kullaniciAdi === "İsmail Yıldırım")) {
            const defaultUsers = [
                { kullaniciAdi: "İsmail Yıldırım", rol: "Finans Müdürü", avatar: "user-check", sifre: "1234" }
            ];
            for (let u of defaultUsers) {
                const exists = list.find(ex => ex.kullaniciAdi.toLowerCase() === u.kullaniciAdi.toLowerCase());
                if (!exists) {
                    await db.collection("erp_kullanicilar").add(u);
                }
            }
            const freshSnap = await db.collection("erp_kullanicilar").get();
            list = freshSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return list;
    },

    // --- SİPARİŞLER ---
    async getSiparisler() {
        if (!db) return [];
        const snap = await db.collection("erp_siparisler").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addSiparis(siparis) {
        if (!db) return;
        return await db.collection("erp_siparisler").add(siparis);
    },

    async updateSiparis(id, yeniVeri) {
        if (!db) return;
        return await db.collection("erp_siparisler").doc(id).update(yeniVeri);
    },

    async deleteSiparis(id) {
        if (!db) return;
        return await db.collection("erp_siparisler").doc(id).delete();
    },

    async setSiparisOdendi(id) {
        if (!db) return;
        return await db.collection("erp_siparisler").doc(id).update({ durum: "Ödendi" });
    },

    // --- CARİ HESAPLAR ---
    async getCariler() {
        if (!db) return [];
        const snap = await db.collection("erp_cariler").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addCari(cari) {
        if (!db) return;
        return await db.collection("erp_cariler").add(cari);
    },

    async updateCari(id, veri) {
        if (!db) return;
        return await db.collection("erp_cariler").doc(id).update(veri);
    },

    async deleteCari(id) {
        if (!db) return;
        return await db.collection("erp_cariler").doc(id).delete();
    },

    // --- CARİ HAREKETLER ---
    async getCariHareketler() {
        if (!db) return [];
        const snap = await db.collection("erp_cari_hareketler").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addCariHareket(hareket) {
        if (!db) return;
        return await db.collection("erp_cari_hareketler").add(hareket);
    },

    async deleteCariHareket(id) {
        if (!db) return;
        return await db.collection("erp_cari_hareketler").doc(id).delete();
    },

    // --- BANKALAR & KASALAR ---
    async getBankalar() {
        if (!db) return [];
        const snap = await db.collection("erp_bankalar").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addBanka(banka) {
        if (!db) return;
        return await db.collection("erp_bankalar").add(banka);
    },

    async updateBanka(id, veri) {
        if (!db) return;
        return await db.collection("erp_bankalar").doc(id).update(veri);
    },

    async deleteBanka(id) {
        if (!db) return;
        return await db.collection("erp_bankalar").doc(id).delete();
    },

    // --- MÜRABAHA KREDİLERİ ---
    async getMurabahaKredileri() {
        if (!db) return [];
        const snap = await db.collection("erp_murabaha_kredileri").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addMurabahaKredisi(kredi) {
        if (!db) return;
        return await db.collection("erp_murabaha_kredileri").add(kredi);
    },

    async updateMurabahaKredisi(id, veri) {
        if (!db) return;
        return await db.collection("erp_murabaha_kredileri").doc(id).update(veri);
    },

    // --- STOKLAR ---
    async getStokKartlari() {
        if (!db) return [];
        const snap = await db.collection("erp_stok").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addStokKarti(stok) {
        if (!db) return;
        return await db.collection("erp_stok").add(stok);
    },

    async updateStokKarti(id, veri) {
        if (!db) return;
        return await db.collection("erp_stok").doc(id).update(veri);
    },

    // --- STOK HAREKETLERİ ---
    async getStokHareketleri() {
        if (!db) return [];
        const snap = await db.collection("erp_stok_hareketler").get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addStokHareket(hareket) {
        if (!db) return;
        return await db.collection("erp_stok_hareketler").add(hareket);
    }
};
