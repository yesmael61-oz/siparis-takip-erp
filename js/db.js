const firebaseConfig = {
    apiKey: "AIzaSyDSp705hKlnOQlHDmrrNFEyQSC0nWvCUGc",
    authDomain: "siparis-takip-18073.firebaseapp.com",
    projectId: "siparis-takip-18073",
    storageBucket: "siparis-takip-18073.firebasestorage.app",
    messagingSenderId: "231850869514",
    appId: "1:231850869514:web:37f825249f42279135b0f3"
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
    },

    // 🔄 MİGRASYON & ONARIM MOTORU (Self-Healing Database)
    async selfHealDatabase() {
        if (!db) return;
        try {
            console.log("Veritabanı onarım ve eşleştirme motoru başlatıldı...");
            const siparisler = await this.getSiparisler();
            const cariler = await this.getCariler();
            const stoklar = await this.getStokKartlari();
            const cariHars = await this.getCariHareketler();
            const stokHars = await this.getStokHareketleri();

            // 0. Ölü/Geçersiz ID İçeren Hareketleri Veritabanından Temizle
            for (let h of cariHars) {
                if (h.cariId && !cariler.some(c => c.id === h.cariId)) {
                    await this.deleteCariHareket(h.id);
                }
            }
            for (let h of stokHars) {
                if (h.urunId && !stoklar.some(u => u.id === h.urunId)) {
                    await db.collection("erp_stok_hareketler").doc(h.id).delete();
                }
            }

            // 1. İlişkisel ID Eşleştirmesi ve Olmayan Kartları Oluşturma
            for (let s of siparisler) {
                let updated = false;

                // Cari Kart Eşleştirme / Oluşturma
                const cariExists = s.cariId ? cariler.some(c => c.id === s.cariId) : false;
                if ((!s.cariId || !cariExists) && s.firmaAdi) {
                    const normalizedFirma = s.firmaAdi.trim();
                    let cari = cariler.find(c => c.unvan.toLowerCase() === normalizedFirma.toLowerCase());
                    if (!cari) {
                        // Yeni cari kart aç
                        const newCari = {
                            unvan: normalizedFirma,
                            telefon: "",
                            tip: s.islemTuru === "Satış" ? "Müşteri" : "Tedarikçi",
                            bakiye: 0
                        };
                        const res = await this.addCari(newCari);
                        newCari.id = res.id;
                        cariler.push(newCari);
                        cari = newCari;
                    }
                    s.cariId = cari.id;
                    updated = true;
                }

                // Stok Kart Eşleştirme / Oluşturma
                const stokExists = s.urunId ? stoklar.some(u => u.id === s.urunId) : false;
                if ((!s.urunId || !stokExists) && s.urunTanimi) {
                    const normalizedUrun = s.urunTanimi.trim();
                    let stok = stoklar.find(u => u.urunAdi.toLowerCase() === normalizedUrun.toLowerCase());
                    if (!stok) {
                        // Yeni stok kartı aç
                        const newStok = {
                            urunAdi: normalizedUrun,
                            birim: "kg",
                            baslangicMiktar: 0,
                            baslangicMaliyet: 0,
                            miktar: 0,
                            ortalamaMaliyet: 0
                        };
                        const res = await this.addStokKarti(newStok);
                        newStok.id = res.id;
                        stoklar.push(newStok);
                        stok = newStok;
                    }
                    s.urunId = stok.id;
                    updated = true;
                }

                if (updated) {
                    await this.updateSiparis(s.id, { cariId: s.cariId, urunId: s.urunId });
                }
            }

            // 2. Eksik Stok ve Cari Hareketleri Yeniden İnşa Etme
            // Bağlantı bazında siparişleri gruplayalım
            const gruplar = {};
            siparisler.forEach(s => {
                if (s.baglantiNo) {
                    if (!gruplar[s.baglantiNo]) {
                        gruplar[s.baglantiNo] = [];
                    }
                    gruplar[s.baglantiNo].push(s);
                }
            });

            for (let bNo in gruplar) {
                const kalemler = gruplar[bNo];
                const ilkKalem = kalemler[0];

                // 2.A: Stok Hareketleri Kontrolü (Her sipariş kalemi için bir stok hareketi olmalı)
                for (let s of kalemler) {
                    const hasStokH = stokHars.some(h => h.aciklama && h.aciklama.includes(s.baglantiNo) && h.urunId === s.urunId);
                    if (!hasStokH && s.urunId) {
                        const newStokH = {
                            urunId: s.urunId,
                            hareketTipi: s.islemTuru === "Satış" ? "Çıkış" : "Giriş",
                            miktar: s.miktar || 0,
                            birimFiyat: (s.tonFiyati || 0) / 1000,
                            tarih: s.siparisTarihi || new Date().toISOString().split('T')[0],
                            aciklama: `${s.baglantiNo} No'lu Sipariş Bağlantısı`
                        };
                        await this.addStokHareket(newStokH);
                        stokHars.push(newStokH);
                    }
                }

                // 2.B: Cari Hareket Kontrolü (Cari ID'si ve Açıklaması eşleşen hareket var mı?)
                const hasCariH = cariHars.some(h => h.aciklama && h.aciklama.includes(bNo) && h.cariId === ilkKalem.cariId);
                if (!hasCariH && ilkKalem.cariId) {
                    const toplamYekun = kalemler.reduce((sum, s) => sum + (s.tutar || 0), 0);
                    const urunOzet = kalemler.map(s => `${s.miktar} kg ${s.urunTanimi}`).join(', ');

                    const newCariH = {
                        cariId: ilkKalem.cariId,
                        tarih: ilkKalem.siparisTarihi || new Date().toISOString().split('T')[0],
                        tur: ilkKalem.islemTuru === "Satış" ? "Satış" : "Alım",
                        borcAlacak: ilkKalem.islemTuru === "Satış" ? "Borç" : "Alacak",
                        tutar: toplamYekun,
                        aciklama: `${bNo} No'lu ${ilkKalem.islemTuru} Bağlantısı (${urunOzet})`
                    };
                    await this.addCariHareket(newCariH);
                    cariHars.push(newCariH);
                }
            }
            console.log("Veritabanı onarım ve eşleştirme işlemi tamamlandı.");
        } catch (e) {
            console.error("Self-heal veritabanı onarım hatası:", e);
        }
    }
};
