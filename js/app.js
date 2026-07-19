// 🚀 Sipariş Takip Uygulama Arayüz Kontrolörü (App.js)
document.addEventListener("DOMContentLoaded", () => {
    App.init();
});

const App = {
    activePage: "dashboard",

    async init() {
        try {
            this.updateDate();
            this.bindEvents();

            // Çoklu kullanıcı ekranını başlat
            const loggedIn = await UserManager.init();
            if (loggedIn) {
                document.getElementById("login-screen").style.display = "none";
                document.getElementById("app-main").style.display = "flex";
                await this.onUserLoggedIn();
            } else {
                document.getElementById("login-screen").style.display = "flex";
                document.getElementById("app-main").style.display = "none";
            }
        } catch (error) {
            console.error("Başlatma hatası:", error);
            alert("Veritabanı Hatası! Lütfen sayfayı yenileyin veya internet bağlantınızı kontrol edin.\n\nHata Detayı: " + (error.message || error.name || error));
        }
    },

    async onUserLoggedIn() {
        try {
            // 🛡️ Yetkili menü gösterim kontrolü
            const navKullanicilar = document.getElementById("nav-kullanicilar");
            if (navKullanicilar) {
                if (UserManager.currentUser?.kullaniciAdi === "İsmail Yıldırım") {
                    navKullanicilar.style.display = "flex";
                } else {
                    navKullanicilar.style.display = "none";
                }
            }

            // İlk verileri oluştur (Eğer boşsa)
            await OrdersModule.seedDataIfEmpty();
            
            // 🔔 GERÇEK ZAMANLI SENKRONİZASYON (Real-time Sync)
            db.collection("siparisler").onSnapshot(() => {
                this.handleRouting();
            });
        } catch (error) {
            console.error("Kullanıcı giriş işlemi hatası:", error);
        }
    },

    updateDate() {
        const span = document.getElementById("current-date");
        if (span) {
            const bugun = new Date();
            span.innerText = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(bugun);
        }
    },

    bindEvents() {
        // Sol menü link geçişleri
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const page = item.getAttribute("data-page");
                window.location.hash = page;
            });
        });

        // URL hash değişimini dinle
        window.addEventListener("hashchange", () => {
            this.handleRouting();
        });
    },

    handleRouting() {
        const hash = window.location.hash.replace("#", "") || "dashboard";
        this.activePage = hash;

        // Navigasyon sınıflarını güncelle
        document.querySelectorAll(".nav-item").forEach(item => {
            if (item.getAttribute("data-page") === hash) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Sayfa başlığı ve içerik motorunu tetikle
        const titleSpan = document.getElementById("current-page-title");
        const subtitleSpan = document.getElementById("current-page-subtitle");

        if (hash === "dashboard") {
            titleSpan.innerText = "Özet Panel";
            subtitleSpan.innerText = "Siparişler, vadeler ve kritik ödemelerin genel görünümü";
            OrdersModule.renderDashboard();
        } else if (hash === "siparisler") {
            titleSpan.innerText = "Aktif Siparişler";
            subtitleSpan.innerText = "Sistemdeki aktif bağlantı sipariş formları listesi";
            OrdersModule.renderActiveOrders();
        } else if (hash === "arsiv") {
            titleSpan.innerText = "Eski İşlemler (Arşiv)";
            subtitleSpan.innerText = "Ödemesi tamamlanmış ve kapatılmış geçmiş siparişler";
            OrdersModule.renderArchivedOrders();
        } else if (hash === "cariler") {
            titleSpan.innerText = "Firma Carileri";
            subtitleSpan.innerText = "Müşteriler, tedarikçiler, alacak, tahsilat ve ödeme hareketleri takibi";
            CariModule.renderCariAccounts();
        } else if (hash === "bankalar") {
            titleSpan.innerText = "Banka & Mürabaha";
            subtitleSpan.innerText = "Banka nakit hesapları, kasalar ve mürabaha alım kredileri yönetimi";
            BankModule.renderBankAccounts();
        } else if (hash === "stok") {
            titleSpan.innerText = "Stok Envanteri";
            subtitleSpan.innerText = "Depodaki mal varlığı, tonaj takibi ve ortalama maliyet dökümü";
            StockModule.renderStockInventory();
        } else if (hash === "raporlar") {
            titleSpan.innerText = "Finansal Raporlar";
            subtitleSpan.innerText = "Grafikler, tarih aralıkları ve tedarikçi bazlı detaylı raporlama";
            OrdersModule.renderRaporlar();
        } else if (hash === "kullanicilar") {
            if (UserManager.currentUser?.kullaniciAdi !== "İsmail Yıldırım") {
                window.location.hash = "dashboard";
                return;
            }
            titleSpan.innerText = "Kullanıcı Yönetimi";
            subtitleSpan.innerText = "Yeni sistem kullanıcısı tanımlama, şifre ve rol güncelleme yetkisi";
            UserManager.renderUserManagement();
        }
    },

    // --- SİPARİŞ MODALI ---
    async openOrderModal() {
        document.getElementById("modal-title").innerText = "Yeni Sipariş Girişi";
        document.getElementById("order-id").value = "";
        document.getElementById("order-form").reset();
        
        // Bugünün tarihini varsayılan olarak ata
        const bugun = new Date().toISOString().split('T')[0];
        document.getElementById("form-tarih").value = bugun;
        
        // Varsayılan form görünümü
        document.getElementById("form-islem-turu").value = "Satış";
        document.getElementById("form-finans-group").style.display = "none";
        document.getElementById("form-murabaha-details").style.display = "none";
        document.getElementById("form-yeni-firma").style.display = "none";

        // Tabloyu temizle
        document.getElementById("order-items-body").innerHTML = "";
        
        await this.populateOrderFormDropdowns();
        this.addOrderItemRow(); // İlk boş satırı ekle
        document.getElementById("order-modal").style.display = "flex";
    },

    closeOrderModal() {
        document.getElementById("order-modal").style.display = "none";
    },

    closeDetailModal() {
        document.getElementById("detail-modal").style.display = "none";
    },

    async openOrderEdit(siparis) {
        if (UserManager.currentUser?.kullaniciAdi !== "İsmail Yıldırım") {
            alert("YETKİSİZ İŞLEM: Sipariş düzenleme yetkisi yalnızca Finans Müdürü İsmail Yıldırım'a aittir!");
            return;
        }
        alert("BİLGİ: ERP Entegre Sipariş modülünde düzenlemeler cari/stok hareketlerini etkilediği için siparişi silip yeni girmek daha sağlıklıdır.");
        document.getElementById("modal-title").innerText = "Siparişi Düzenle";
        document.getElementById("order-id").value = siparis.id;
        
        await this.populateOrderFormDropdowns();
        
        document.getElementById("form-islem-turu").value = siparis.islemTuru || "Satış";
        document.getElementById("form-baglanti").value = siparis.baglantiNo;
        document.getElementById("form-tarih").value = siparis.siparisTarihi;
        document.getElementById("form-vade").value = siparis.vadeTarihi;

        // Düzenlenen siparişi tek kalem olarak tabloya yükle
        document.getElementById("order-items-body").innerHTML = "";
        this.addOrderItemRow({
            urunId: siparis.urunId,
            miktar: siparis.miktar,
            tonFiyati: siparis.tonFiyati,
            kdvOrani: siparis.kdvOrani !== undefined ? siparis.kdvOrani : 20,
            tevkifatOrani: siparis.tevkifatOrani !== undefined ? siparis.tevkifatOrani : 5
        });
        
        this.onOrderTypeChange();
        document.getElementById("order-modal").style.display = "flex";
    },

    async populateOrderFormDropdowns() {
        const cariler = await DBService.getCariler();
        const stoklar = await DBService.getStokKartlari();
        this.stoklarCached = stoklar;

        // 1. Firma Dropdown
        const firmaSelect = document.getElementById("form-firma");
        if (firmaSelect) {
            let optionsHtml = '<option value="">-- Firma Seçin --</option>';
            optionsHtml += cariler.map(c => `<option value="${c.id}">${c.unvan} (${c.tip})</option>`).join('');
            optionsHtml += '<option value="NEW_CARI">+ Yeni Firma Kaydet...</option>';
            firmaSelect.innerHTML = optionsHtml;
        }

        // 3. Banka Dropdown
        const bankaSelect = document.getElementById("form-mura-banka");
        if (bankaSelect) {
            const bankalar = cariler.filter(c => c.tip === "Banka");
            bankaSelect.innerHTML = bankalar.map(b => `<option value="${b.id}">${b.unvan}</option>`).join('');
        }
    },

    addOrderItemRow(initialData = null) {
        const body = document.getElementById("order-items-body");
        if (!body) return;

        const rowId = `row_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const tr = document.createElement("tr");
        tr.className = "order-item-row";
        tr.id = rowId;

        const stoklar = this.stoklarCached || [];
        let urunOptions = '<option value="">-- Seçin --</option>';
        urunOptions += stoklar.map(s => `<option value="${s.id}" ${initialData && initialData.urunId === s.id ? 'selected' : ''}>${s.urunAdi}</option>`).join('');
        urunOptions += '<option value="NEW_PRODUCT">+ Yeni Ürün Kartı Aç...</option>';

        tr.innerHTML = `
            <td>
                <select class="form-control item-urun-sec" onchange="App.onRowUrunChange('${rowId}')" required>
                    ${urunOptions}
                </select>
                <input type="text" class="form-control item-yeni-urun" placeholder="Yeni Ürün Adı" style="display:none; margin-top:0.25rem;">
            </td>
            <td>
                <input type="number" class="form-control item-miktar" value="${initialData ? initialData.miktar : ''}" oninput="App.calculateOrderTotal()" required placeholder="Kg">
            </td>
            <td>
                <input type="number" step="0.01" class="form-control item-ton-fiyati" value="${initialData ? initialData.tonFiyati : ''}" oninput="App.calculateOrderTotal()" required placeholder="₺">
            </td>
            <td>
                <select class="form-control item-kdv" onchange="App.calculateOrderTotal()" required>
                    <option value="20" ${initialData && initialData.kdvOrani == 20 ? 'selected' : ''}>20%</option>
                    <option value="10" ${initialData && initialData.kdvOrani == 10 ? 'selected' : ''}>10%</option>
                    <option value="0" ${initialData && initialData.kdvOrani == 0 ? 'selected' : ''}>0%</option>
                </select>
            </td>
            <td>
                <select class="form-control item-tevkifat" onchange="App.calculateOrderTotal()" required>
                    <option value="5" ${initialData && initialData.tevkifatOrani == 5 ? 'selected' : ''}>5/10</option>
                    <option value="0" ${initialData && initialData.tevkifatOrani == 0 ? 'selected' : ''}>0/10</option>
                </select>
            </td>
            <td>
                <input type="number" class="form-control item-matrah" readonly style="background:transparent; border:none; padding:0; height:auto; font-weight:600;" value="0.00">
            </td>
            <td>
                <input type="number" class="form-control item-yekun" readonly style="background:transparent; border:none; padding:0; height:auto; font-weight:700; color:var(--accent-cyan);" value="0.00">
            </td>
            <td>
                <button type="button" class="logout-btn" style="padding:4px; margin:0;" onclick="App.removeOrderItemRow('${rowId}')">
                    <i data-lucide="trash-2" style="width:14px; height:14px; color:var(--status-red);"></i>
                </button>
            </td>
        `;

        body.appendChild(tr);
        if (window.lucide) lucide.createIcons();
        this.calculateOrderTotal();
    },

    removeOrderItemRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
            this.calculateOrderTotal();
        }
    },

    onRowUrunChange(rowId) {
        const row = document.getElementById(rowId);
        if (!row) return;
        const val = row.querySelector(".item-urun-sec").value;
        const input = row.querySelector(".item-yeni-urun");
        if (val === "NEW_PRODUCT") {
            input.style.display = "block";
            input.required = true;
        } else {
            input.style.display = "none";
            input.required = false;
        }
    },

    onOrderTypeChange() {
        const type = document.getElementById("form-islem-turu").value;
        const finansGroup = document.getElementById("form-finans-group");
        if (type === "Satın Alma") {
            finansGroup.style.display = "block";
        } else {
            finansGroup.style.display = "none";
            document.getElementById("form-finans-turu").value = "Açık Hesap";
            document.getElementById("form-murabaha-details").style.display = "none";
        }
    },

    onFinansTuruChange() {
        const tur = document.getElementById("form-finans-turu").value;
        const muraDetails = document.getElementById("form-murabaha-details");
        if (tur === "Mürabaha") {
            muraDetails.style.display = "block";
        } else {
            muraDetails.style.display = "none";
        }
    },

    onFirmaSelectChange() {
        const val = document.getElementById("form-firma").value;
        const input = document.getElementById("form-yeni-firma");
        if (val === "NEW_CARI") {
            input.style.display = "block";
            input.required = true;
        } else {
            input.style.display = "none";
            input.required = false;
        }
    },

    calculateOrderTotal() {
        const rows = document.querySelectorAll(".order-item-row");
        let totalMatrah = 0;
        let totalTevkifat = 0;
        let totalYekun = 0;

        rows.forEach(row => {
            const miktar = parseFloat(row.querySelector(".item-miktar").value) || 0;
            const tonFiyati = parseFloat(row.querySelector(".item-ton-fiyati").value) || 0;
            const kdvOranPct = parseFloat(row.querySelector(".item-kdv").value) || 0;
            const tevkifatOranDec = parseFloat(row.querySelector(".item-tevkifat").value) / 10 || 0;

            const matrah = (miktar * tonFiyati) / 1000;
            const kdv = matrah * (kdvOranPct / 100);
            const tevkifatTutar = kdv * tevkifatOranDec;
            const yekun = matrah + kdv - tevkifatTutar;

            row.querySelector(".item-matrah").value = matrah.toFixed(2);
            row.querySelector(".item-yekun").value = yekun.toFixed(2);

            totalMatrah += matrah;
            totalTevkifat += tevkifatTutar;
            totalYekun += yekun;
        });

        const formatTL = val => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

        const summaryMatrah = document.getElementById("summary-matrah");
        const summaryTevkifat = document.getElementById("summary-tevkifat");
        const summaryYekun = document.getElementById("summary-yekun");

        if (summaryMatrah) summaryMatrah.innerText = formatTL(totalMatrah);
        if (summaryTevkifat) summaryTevkifat.innerText = formatTL(totalTevkifat);
        if (summaryYekun) summaryYekun.innerText = formatTL(totalYekun);
    },

    async handleOrderSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById("order-id").value;
        const islemTuru = document.getElementById("form-islem-turu").value;
        const baglantiNo = document.getElementById("form-baglanti").value.trim();
        const tarih = document.getElementById("form-tarih").value;
        const vade = document.getElementById("form-vade").value;
        
        let cariId = document.getElementById("form-firma").value;

        // 1. GEREKİRSE YENİ CARİ OLUŞTUR
        if (cariId === "NEW_CARI") {
            const yeniFirmaAd = document.getElementById("form-yeni-firma").value.trim();
            if (!yeniFirmaAd) return;
            const newC = {
                unvan: this.turkceTitleCase(yeniFirmaAd),
                tip: islemTuru === "Satış" ? "Müşteri" : "Tedarikçi",
                telefon: "-",
                bakiye: 0
            };
            const cRes = await DBService.addCari(newC);
            cariId = cRes.id;
        }

        const cariler = await DBService.getCariler();
        const cari = cariler.find(c => c.id === cariId);
        if (!cari) {
            alert("Hata: Firma bulunamadı!");
            return;
        }

        // MÜKERRER KAYIT KONTROLÜ (Sadece yeni kayıtta)
        if (!id) {
            const snap = await db.collection("erp_siparisler").where("baglantiNo", "==", baglantiNo).get();
            if (!snap.empty) {
                alert(`HATA: "${baglantiNo}" numaralı sipariş bağlantısı zaten kayıtlı! Aynı bağlantı numarasını tekrar ekleyemezsiniz.`);
                return;
            }
        }

        const rows = document.querySelectorAll(".order-item-row");
        if (rows.length === 0) {
            alert("Hata: En az bir sipariş kalemi eklemelisiniz!");
            return;
        }

        let genelToplamYekun = 0;
        let urunTanimiOzet = [];

        for (let row of rows) {
            let urunId = row.querySelector(".item-urun-sec").value;
            const miktar = parseInt(row.querySelector(".item-miktar").value) || 0;
            const tonFiyati = parseFloat(row.querySelector(".item-ton-fiyati").value) || 0;
            const kdvOrani = parseFloat(row.querySelector(".item-kdv").value) || 0;
            const tevkifatOrani = parseFloat(row.querySelector(".item-tevkifat").value) || 0;
            
            const matrah = (miktar * tonFiyati) / 1000;
            const kdv = matrah * (kdvOrani / 100);
            const tevkifatKdv = kdv * (tevkifatOrani / 10);
            const tutar = matrah + kdv - tevkifatKdv; // Net Cari Yekün

            // Gerekirse yeni stok kartı aç
            if (urunId === "NEW_PRODUCT") {
                const yeniUrunAd = row.querySelector(".item-yeni-urun").value.trim();
                if (!yeniUrunAd) return;
                const newS = {
                    urunAdi: yeniUrunAd.toUpperCase(),
                    birim: "kg",
                    baslangicMiktar: 0,
                    baslangicMaliyet: 0,
                    miktar: 0,
                    ortalamaMaliyet: 0
                };
                const sRes = await DBService.addStokKarti(newS);
                urunId = sRes.id;
            }

            const stoklar = await DBService.getStokKartlari();
            const urun = stoklar.find(s => s.id === urunId);
            if (!urun) continue;

            genelToplamYekun += tutar;
            urunTanimiOzet.push(`${miktar} kg ${urun.urunAdi}`);

            const data = {
                islemTuru: islemTuru,
                firmaAdi: cari.unvan,
                cariId: cariId,
                baglantiNo: baglantiNo,
                siparisTarihi: tarih,
                vadeTarihi: vade,
                tutar: tutar,
                tonFiyati: tonFiyati,
                miktar: miktar,
                kdvOrani: kdvOrani,
                tevkifatOrani: tevkifatOrani,
                matrah: matrah,
                tevkifatKdv: tevkifatKdv,
                urunTanimi: urun.urunAdi,
                urunId: urunId,
                durum: "Aktif",
                ekleyenKullanici: UserManager.currentUser ? UserManager.currentUser.kullaniciAdi : "Sistem"
            };

            if (id) {
                await DBService.updateSiparis(id, data);
            } else {
                await DBService.addSiparis(data);
            }

            // STOK HAREKET ENTEGRASYONU
            const stokH = {
                urunId: urunId,
                hareketTipi: islemTuru === "Satış" ? "Çıkış" : "Giriş",
                miktar: miktar,
                birimFiyat: tonFiyati / 1000,
                tarih: tarih,
                aciklama: `${baglantiNo} No'lu Sipariş Bağlantısı`
            };
            await DBService.addStokHareket(stokH);
        }

        // CARİ HAREKET ENTEGRASYONU (Toplam Yekün Üzerinden Tek Cari Fişi)
        if (islemTuru === "Satış") {
            const cariH = {
                cariId: cariId,
                tarih: tarih,
                tur: "Satış",
                borcAlacak: "Borç",
                tutar: genelToplamYekun,
                aciklama: `${baglantiNo} No'lu Satış Bağlantısı (${urunTanimiOzet.join(', ')})`
            };
            await DBService.addCariHareket(cariH);
        } else {
            const cariH = {
                cariId: cariId,
                tarih: tarih,
                tur: "Alım",
                borcAlacak: "Alacak",
                tutar: genelToplamYekun,
                aciklama: `${baglantiNo} No'lu Alım Bağlantısı (${urunTanimiOzet.join(', ')})`
            };
            await DBService.addCariHareket(cariH);

            // MÜRABAHA ENTEGRASYONU (Seçildiyse)
            const finansTuru = document.getElementById("form-finans-turu").value;
            if (finansTuru === "Mürabaha") {
                const bankaCariId = document.getElementById("form-mura-banka").value;
                const karPayi = parseFloat(document.getElementById("form-mura-kar").value) || 0;
                const toplamBorc = genelToplamYekun + karPayi;

                const newKredi = {
                    bankaCariId: bankaCariId,
                    tarih: tarih,
                    malBedeli: genelToplamYekun,
                    karPayi: karPayi,
                    toplamBorc: toplamBorc,
                    vadeTarihi: vade,
                    durum: "Aktif",
                    aciklama: `${baglantiNo} No'lu Alım Mürabaha Kredisi`
                };
                const resM = await DBService.addMurabahaKredisi(newKredi);

                const bankaHareketi = {
                    cariId: bankaCariId,
                    tarih: tarih,
                    tur: "Alım",
                    borcAlacak: "Borç",
                    tutar: toplamBorc,
                    aciklama: `Mürabaha Kredi Kullanımı: ${baglantiNo} (Vade: ${new Date(vade).toLocaleDateString('tr-TR')})`,
                    referansId: resM.id
                };
                await DBService.addCariHareket(bankaHareketi);

                const tedarikciKapatma = {
                    cariId: cariId,
                    tarih: tarih,
                    tur: "Ödeme",
                    borcAlacak: "Borç",
                    tutar: genelToplamYekun,
                    aciklama: `${baglantiNo} No'lu Sipariş Mürabaha ile Ödendi (Bankadan Havale)`
                };
                await DBService.addCariHareket(tedarikciKapatma);
            }
        }

        this.showToast("Çoklu sipariş kalemleri başarıyla veritabanına ve ERP modüllerine işlendi.");
        this.closeOrderModal();
        this.handleRouting();
    },

    // Datalist yerine Dropdownları dolduruyoruz
    async populateFirmaDatalist() {
        // Eski metodun hata vermemesi için boş bırakıyoruz
    },

    // Türkçe Title Case (Yazım Hataları ve Aynı Carileri Birleştirmek İçin Normalizasyon)
    turkceTitleCase(str) {
        let kelimeler = str.trim().replace(/\s+/g, ' ').split(" ");
        for (let i = 0; i < kelimeler.length; i++) {
            let k = kelimeler[i];
            if (k.length > 0) {
                kelimeler[i] = k.charAt(0).toLocaleUpperCase("tr-TR") + k.slice(1).toLocaleLowerCase("tr-TR");
            }
        }
        return kelimeler.join(" ");
    },

    // --- UYARI / BİLDİRİM BALONU ---
    showToast(message) {
        const toast = document.createElement("div");
        toast.className = "glass-panel";
        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.right = "20px";
        toast.style.padding = "1rem 1.5rem";
        toast.style.zIndex = "9999";
        toast.style.borderColor = "var(--accent-cyan)";
        toast.style.background = "var(--bg-glass-hover)";
        toast.style.color = "#fff";
        toast.style.fontWeight = "600";
        toast.style.fontSize = "0.9rem";
        toast.style.animation = "scaleUp 0.3s ease";
        toast.innerText = message;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3500);
    },

    async exportBackup() {
        try {
            if (!db) throw new Error("Veritabanı bağlantısı yok!");
            
            const collections = [
                "erp_siparisler", "erp_kullanicilar", "erp_cariler", 
                "erp_cari_hareketler", "erp_bankalar", "erp_murabaha_kredileri", 
                "erp_stok", "erp_stok_hareketler"
            ];
            
            const backupData = {
                version: "erp_v1",
                date: new Date().toISOString(),
                collections: {}
            };
            
            for (let col of collections) {
                const snap = await db.collection(col).get();
                backupData.collections[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `siparis_takip_erp_yedek_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast("ERP Verileri başarıyla yedeklendi!");
        } catch (e) {
            console.error(e);
            alert("Yedekleme sırasında bir hata oluştu: " + e.message);
        }
    },

    async importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const confirmImport = confirm("DİKKAT: Yeni yedeği yüklemek buluttaki tüm cari, stok, banka ve sipariş verilerini SİLECEK ve yerine yedektekileri yükleyecektir. Devam etmek istiyor musunuz?");
        if (!confirmImport) {
            event.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!db) throw new Error("Veritabanı bağlantısı yok!");
                const data = JSON.parse(e.target.result);
                
                const collections = [
                    "erp_siparisler", "erp_kullanicilar", "erp_cariler", 
                    "erp_cari_hareketler", "erp_bankalar", "erp_murabaha_kredileri", 
                    "erp_stok", "erp_stok_hareketler"
                ];

                // Eski ve yeni format kontrolü
                let sourceData = {};
                if (data.collections) {
                    sourceData = data.collections;
                } else if (data.siparisler && data.kullanicilar) {
                    sourceData["erp_siparisler"] = data.siparisler;
                    sourceData["erp_kullanicilar"] = data.kullanicilar;
                } else {
                    throw new Error("Geçersiz yedek dosyası formatı!");
                }

                // 1. Mevcut tüm ERP koleksiyonlarını buluttan tamamen temizle
                for (let col of collections) {
                    const snap = await db.collection(col).get();
                    if (!snap.empty) {
                        const batch = db.batch();
                        snap.docs.forEach(doc => {
                            batch.delete(doc.ref);
                        });
                        await batch.commit();
                    }
                }

                // 2. Yedek verileri Firestore'a yükle
                for (let col of collections) {
                    const list = sourceData[col];
                    if (list && Array.isArray(list)) {
                        for (let item of list) {
                            delete item.id; // Firebase otomatik yeni ID atasın
                            await db.collection(col).add(item);
                        }
                    }
                }

                this.showToast("Yedek başarıyla yüklendi! Sayfa güncelleniyor...");
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (err) {
                console.error(err);
                alert("Yedek yükleme başarısız: " + err.message);
            }
        };
        reader.readAsText(file);
    },

    logout() {
        UserManager.logout();
    }
};
