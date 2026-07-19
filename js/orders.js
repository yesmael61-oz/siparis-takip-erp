// 📝 Sipariş Takip ve Hatırlatıcı Mantığı
const OrdersModule = {
    // Para birimi formatlama
    formatTL(tutar) {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(tutar);
    },

    // Miktar formatlama
    formatKg(miktar) {
        return new Intl.NumberFormat('tr-TR').format(miktar) + " kg";
    },

    // Tarih formatlama (Y-m-d ➔ d.m.Y)
    formatTarih(tarihStr) {
        if (!tarihStr) return "-";
        const parts = tarihStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return tarihStr;
    },

    // Varsayılan ilk verileri ekle (Mehmet Ali Demir Çelik reçetesi dahil)
    async seedDataIfEmpty() {
        // 🗑️ Kardeşler Hafriyat firmasına ait tüm kayıtları bellek içinde güvenle temizle
        const tumSiparisler = await DBService.getSiparisler();
        for (let s of tumSiparisler) {
            if (s.firmaAdi && s.firmaAdi.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR') === "kardeşler hafriyat") {
                await DBService.deleteSiparis(s.id);
            }
        }

        const list = await DBService.getSiparisler();
        if (list.length === 0) {
            const seed = [
                {
                    baglantiNo: "11013183",
                    firmaAdi: "Mehmet Ali Demir Çelik",
                    siparisTarihi: "2026-07-16",
                    vadeTarihi: "2026-07-24",
                    tutar: 4093836.38,
                    urunTanimi: "12 lik ve üstü inşaat demiri",
                    miktar: 140000,
                    durum: "Aktif",
                    ekleyenKullanici: "Elif Kaya"
                },
                {
                    baglantiNo: "11013184",
                    firmaAdi: "Yıldız Yapı İnşaat A.Ş.",
                    siparisTarihi: "2026-07-10",
                    vadeTarihi: "2026-07-17",
                    tutar: 1850000.00,
                    urunTanimi: "C30 Hazır Beton",
                    miktar: 90000,
                    durum: "Aktif", // Vadesi 17'si olduğu için gecikmiş görünecek
                    ekleyenKullanici: "İsmail Yıldırım"
                }
            ];
            for (let s of seed) {
                await DBService.addSiparis(s);
            }
        }
    },

    // Özet Panel (Dashboard) Görünümü
    async renderDashboard() {
        const container = document.getElementById("page-container");
        const siparisler = await DBService.getSiparisler();
        
        // Rakamı küçükten büyüğe sıralama (Bağlantı No)
        siparisler.sort((a, b) => {
            const numA = parseInt(a.baglantiNo) || 0;
            const numB = parseInt(b.baglantiNo) || 0;
            return numA - numB;
        });

        const bankalar = await DBService.getBankalar();
        const krediler = await DBService.getMurabahaKredileri();
        const stoklar = await DBService.getStokKartlari();
        const hareketler = await DBService.getStokHareketleri();
        const bugun = new Date();
        bugun.setHours(0,0,0,0);

        // Stok kartı miktarlarını hesapla
        stoklar.forEach(s => {
            const urunHars = hareketler.filter(h => h.urunId === s.id);
            let miktar = s.baslangicMiktar || 0;
            let toplamMaliyet = (s.baslangicMiktar || 0) * (s.baslangicMaliyet || 0);
            urunHars.forEach(h => {
                if (h.hareketTipi === "Giriş") {
                    miktar += h.miktar;
                    toplamMaliyet += h.miktar * h.birimFiyat;
                } else {
                    miktar -= h.miktar;
                }
            });
            s.miktar = miktar;
            s.ortalamaMaliyet = miktar > 0 ? (toplamMaliyet / ((s.baslangicMiktar || 0) + urunHars.filter(h => h.hareketTipi === "Giriş").reduce((sum, h) => sum + h.miktar, 0) || 1)) : 0;
        });

        const totalStockValue = stoklar.reduce((sum, s) => sum + (s.miktar * s.ortalamaMaliyet), 0);
        const totalBankBalance = bankalar.reduce((sum, b) => sum + (b.bakiye || 0), 0);
        const activeMurabahaCount = krediler.filter(k => k.durum === "Aktif").length;
        const totalMurabahaDebt = krediler.filter(k => k.durum === "Aktif").reduce((sum, k) => sum + k.toplamBorc, 0);

        // Durumlara göre ayır ve durumları vade tarihine göre güncelle
        let aktifHacim = 0;
        let gecikmisHacim = 0;
        let gecikmisAdet = 0;
        let aktifAdet = 0;
        let kritikAdet = 0;
        let kritikHacim = 0;
        let arsivHacim = 0;
        let arsivAdet = 0;

        const kritikListesi = [];

        siparisler.forEach(s => {
            if (s.durum === "Ödendi") {
                arsivHacim += s.tutar;
                arsivAdet++;
            } else {
                const vade = new Date(s.vadeTarihi);
                vade.setHours(0,0,0,0);
                
                const diffTime = vade - bugun;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    s.hesaplananDurum = "Gecikmiş";
                    gecikmisHacim += s.tutar;
                    gecikmisAdet++;
                } else {
                    s.hesaplananDurum = "Aktif";
                    aktifHacim += s.tutar;
                    aktifAdet++;

                    // Vadesine 3 gün veya daha az kalanlar
                    if (diffDays <= 3) {
                        kritikAdet++;
                        kritikHacim += s.tutar;
                        kritikListesi.push(s);
                    }
                }
            }
        });

        container.innerHTML = `
            <!-- ERP Finansal Özet Grid -->
            <div class="kpi-grid" style="margin-bottom:1.5rem; grid-template-columns: repeat(3, 1fr);">
                <div class="glass-panel kpi-card" style="border-color: rgba(6, 182, 212, 0.25)">
                    <div class="kpi-card-header">
                        <span>Toplam Banka &amp; Kasa Bakiyesi</span>
                        <i data-lucide="landmark" style="color:var(--accent-cyan)"></i>
                    </div>
                    <div class="kpi-card-value" style="color:var(--accent-cyan)">${this.formatTL(totalBankBalance)}</div>
                    <div class="kpi-card-footer">${bankalar.length} adet aktif nakit hesap/kasa tanımlı</div>
                </div>

                <div class="glass-panel kpi-card" style="border-color: rgba(139, 92, 246, 0.25)">
                    <div class="kpi-card-header">
                        <span>Depo Envanter Değeri (Stok)</span>
                        <i data-lucide="boxes" style="color:var(--accent-violet)"></i>
                    </div>
                    <div class="kpi-card-value" style="color:var(--accent-violet)">${this.formatTL(totalStockValue)}</div>
                    <div class="kpi-card-footer">${(stoklar.reduce((sum, s) => sum + s.miktar, 0) / 1000).toFixed(2)} ton envanter demir hakkı</div>
                </div>

                <div class="glass-panel kpi-card" style="border-color: rgba(239, 68, 68, 0.25)">
                    <div class="kpi-card-header">
                        <span>Mürabaha Finansman Borcu</span>
                        <i data-lucide="alert-triangle" style="color:var(--status-red)"></i>
                    </div>
                    <div class="kpi-card-value" style="color:var(--status-red)">${this.formatTL(totalMurabahaDebt)}</div>
                    <div class="kpi-card-footer">${activeMurabahaCount} adet ödemesi yaklaşan banka borcu</div>
                </div>
            </div>

            <!-- Satış Siparişleri KPI Kartları -->
            <div class="kpi-grid" style="margin-bottom:2rem;">
                <div class="glass-panel kpi-card">
                    <div class="kpi-card-header">
                        <span>Aktif Sipariş Hacmi</span>
                        <i data-lucide="trending-up" style="color:var(--accent-cyan)"></i>
                    </div>
                    <div class="kpi-card-value">${this.formatTL(aktifHacim)}</div>
                    <div class="kpi-card-footer">${aktifAdet} adet aktif sipariş formunda</div>
                </div>

                <div class="glass-panel kpi-card" style="border-color: rgba(239, 68, 68, 0.2)">
                    <div class="kpi-card-header">
                        <span>Gecikmiş Ödemeler</span>
                        <i data-lucide="alert-octagon" style="color:var(--status-red)"></i>
                    </div>
                    <div class="kpi-card-value" style="color:var(--status-red)">${this.formatTL(gecikmisHacim)}</div>
                    <div class="kpi-card-footer" style="color:var(--status-red)">${gecikmisAdet} adet ödemesi gecikmiş form</div>
                </div>

                <div class="glass-panel kpi-card" style="border-color: rgba(245, 158, 11, 0.2)">
                    <div class="kpi-card-header">
                        <span>Kritik Ödemeler (Son 3 Gün)</span>
                        <i data-lucide="bell" style="color:var(--status-yellow)"></i>
                    </div>
                    <div class="kpi-card-value" style="color:var(--status-yellow)">${this.formatTL(kritikHacim)}</div>
                    <div class="kpi-card-footer">${kritikAdet} adet vadesi yaklaşan ödeme var</div>
                </div>

                <div class="glass-panel kpi-card" style="border-color: rgba(16, 185, 129, 0.2)">
                    <div class="kpi-card-header">
                        <span>Toplam Arşivlenen Hacim</span>
                        <i data-lucide="archive" style="color:var(--status-green)"></i>
                    </div>
                    <div class="kpi-card-value" style="color:var(--status-green)">${this.formatTL(arsivHacim)}</div>
                    <div class="kpi-card-footer">${arsivAdet} adet başarılı kapanan sipariş</div>
                </div>
            </div>

            <!-- Kritik Vadeler Tablosu (Varsa) -->
            ${kritikListesi.length > 0 || gecikmisAdet > 0 ? `
            <div class="glass-panel alert-banner" style="margin-bottom:2rem;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <i data-lucide="alert-triangle" style="color:var(--status-red); width:24px; height:24px;"></i>
                    <div>
                        <strong style="color:var(--text-primary)">Ödeme Uyarısı:</strong> 
                        <span>Şu anda vadesi gelen veya gecikmiş ${gecikmisAdet + kritikAdet} sipariş formu bulunmaktadır.</span>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Yaklaşan ve Geciken Siparişlerin Detayı -->
            <div class="glass-panel" style="padding:1.5rem;">
                <h3 style="margin-bottom:1rem; font-family:var(--font-heading)">Takip Listesi ve Özet Tablosu</h3>
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Bağlantı No</th>
                            <th>Firma Adı</th>
                            <th>Ürün Tanımı</th>
                            <th>Miktar</th>
                            <th>Vade Tarihi</th>
                            <th>Tutar</th>
                            <th>Kalan Gün</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${siparisler.filter(s => s.durum !== "Ödendi").map(s => {
                            const vade = new Date(s.vadeTarihi);
                            vade.setHours(0,0,0,0);
                            const diff = vade - bugun;
                            const kalanGun = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            
                            let gunText = kalanGun < 0 ? `${Math.abs(kalanGun)} gün geçti` : `${kalanGun} gün kaldı`;
                            let badgeClass = "badge-active";
                            let statusText = "Aktif";

                            if (kalanGun < 0) {
                                badgeClass = "badge-overdue";
                                statusText = "Gecikmiş";
                            } else if (kalanGun <= 3) {
                                badgeClass = "badge-overdue"; // Yakın ödemeler de kırmızı/sarı alarm
                                statusText = "Kritik Vade";
                            }

                            return `
                                <tr>
                                    <td style="font-weight:bold;"><span class="clickable-link" onclick="OrdersModule.showOrderDetail('${s.id}')">${s.baglantiNo}</span></td>
                                    <td>${s.firmaAdi}</td>
                                    <td>${s.urunTanimi}</td>
                                    <td>${this.formatKg(s.miktar)}</td>
                                    <td>${this.formatTarih(s.vadeTarihi)}</td>
                                    <td style="font-weight:600;">${this.formatTL(s.tutar)}</td>
                                    <td style="font-weight:500; color:${kalanGun < 0 ? 'var(--status-red)' : 'var(--text-primary)'}">${gunText}</td>
                                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                                </tr>
                            `;
                        }).join('')}
                        ${siparisler.filter(s => s.durum !== "Ödendi").length === 0 ? `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary);">Takipte olan aktif sipariş formu bulunmuyor.</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    // Aktif Siparişler Listesi
    async renderActiveOrders() {
        const container = document.getElementById("page-container");
        const siparisler = await DBService.getSiparisler();
        
        // Rakamı küçükten büyüğe sıralama (Bağlantı No)
        siparisler.sort((a, b) => {
            const numA = parseInt(a.baglantiNo) || 0;
            const numB = parseInt(b.baglantiNo) || 0;
            return numA - numB;
        });

        const bugun = new Date();
        bugun.setHours(0,0,0,0);

        const aktifler = siparisler.filter(s => s.durum !== "Ödendi");

        container.innerHTML = `
            <div class="glass-panel">
                <div class="table-header-actions">
                    <h3 style="font-family:var(--font-heading)">Aktif Bağlantılar & Siparişler</h3>
                    <button class="btn btn-primary" onclick="App.openOrderModal()">
                        <i data-lucide="plus-circle"></i> Yeni Sipariş Girişi
                    </button>
                </div>
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Bağlantı No</th>
                            <th>Firma Adı</th>
                            <th>Sipariş Tarihi</th>
                            <th>Vade Tarihi</th>
                            <th>Ürün Tanımı</th>
                            <th>Miktar</th>
                            <th>Tutar</th>
                            <th>Temsilci</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${aktifler.map(s => {
                            const vade = new Date(s.vadeTarihi);
                            vade.setHours(0,0,0,0);
                            const isOverdue = vade < bugun;

                            return `
                                <tr style="border-left: 3px solid ${isOverdue ? 'var(--status-red)' : 'var(--accent-cyan)'}">
                                    <td style="font-weight:bold;"><span class="clickable-link" onclick="OrdersModule.showOrderDetail('${s.id}')">${s.baglantiNo}</span></td>
                                    <td>${s.firmaAdi}</td>
                                    <td>${this.formatTarih(s.siparisTarihi)}</td>
                                    <td style="color:${isOverdue ? 'var(--status-red)' : 'var(--text-primary)'}; font-weight:600;">${this.formatTarih(s.vadeTarihi)}</td>
                                    <td>${s.urunTanimi}</td>
                                    <td>${this.formatKg(s.miktar)}</td>
                                    <td style="font-weight:600;">${this.formatTL(s.tutar)}</td>
                                    <td>${s.ekleyenKullanici || 'Sistem'}</td>
                                    <td>
                                        <div style="display:flex; gap:6px;">
                                            <button class="btn-action btn-archive" title="Ödendi ve Arşive Gönder" onclick="OrdersModule.markAsPaid('${s.id}')">
                                                <i data-lucide="check-circle-2"></i> Ödendi
                                            </button>
                                            <button class="btn-action" title="Düzenle" onclick="App.openOrderEdit(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                                                <i data-lucide="edit-3"></i>
                                            </button>
                                            <button class="btn-action" style="color:var(--status-red)" title="Sil" onclick="OrdersModule.deleteOrder('${s.id}')">
                                                <i data-lucide="trash-2"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                        ${aktifler.length === 0 ? `<tr><td colspan="9" style="text-align:center; color:var(--text-secondary); padding:2rem;">Aktif sipariş bulunmuyor. Yeni sipariş ekleyebilirsiniz.</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    // Eski İşlemler (Arşiv) Listesi
    async renderArchivedOrders() {
        const container = document.getElementById("page-container");
        const siparisler = await DBService.getSiparisler();
        
        // Rakamı küçükten büyüğe sıralama (Bağlantı No)
        siparisler.sort((a, b) => {
            const numA = parseInt(a.baglantiNo) || 0;
            const numB = parseInt(b.baglantiNo) || 0;
            return numA - numB;
        });

        const arsiv = siparisler.filter(s => s.durum === "Ödendi");

        container.innerHTML = `
            <div class="glass-panel">
                <div class="table-header-actions">
                    <h3 style="font-family:var(--font-heading)">Eski İşlemler (Kapanan / Arşivlenen)</h3>
                </div>
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Bağlantı No</th>
                            <th>Firma Adı</th>
                            <th>Sipariş Tarihi</th>
                            <th>Vade Tarihi (Kapanış)</th>
                            <th>Ürün Tanımı</th>
                            <th>Miktar</th>
                            <th>Tutar</th>
                            <th>Ekleyen</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${arsiv.map(s => `
                            <tr style="border-left: 3px solid var(--status-green)">
                                <td style="font-weight:bold;"><span class="clickable-link" onclick="OrdersModule.showOrderDetail('${s.id}')">${s.baglantiNo}</span></td>
                                <td>${s.firmaAdi}</td>
                                <td>${this.formatTarih(s.siparisTarihi)}</td>
                                <td>${this.formatTarih(s.vadeTarihi)}</td>
                                <td>${s.urunTanimi}</td>
                                <td>${this.formatKg(s.miktar)}</td>
                                <td style="font-weight:600;">${this.formatTL(s.tutar)}</td>
                                <td>${s.ekleyenKullanici || 'Sistem'}</td>
                                <td><span class="badge badge-paid"><i data-lucide="check" style="width:12px; height:12px; margin-right:4px;"></i> Ödendi</span></td>
                            </tr>
                        `).join('')}
                        ${arsiv.length === 0 ? `<tr><td colspan="9" style="text-align:center; color:var(--text-secondary); padding:2rem;">Henüz arşivlenmiş (ödendi olarak işaretlenmiş) sipariş bulunmuyor.</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    // Ödendi olarak işaretle ve Arşivle
    async markAsPaid(id) {
        if (UserManager.currentUser?.kullaniciAdi !== "İsmail Yıldırım") {
            alert("YETKİSİZ İŞLEM: Ödeme kapatma ve arşivleme yetkisi yalnızca Finans Müdürü İsmail Yıldırım'a aittir!");
            return;
        }
        if (confirm("Bu siparişin ödemesi yapıldı mı? Ödendi ise arşive kaldırılacaktır.")) {
            await DBService.setSiparisOdendi(id);
            App.showToast("Sipariş başarıyla ödendi olarak işaretlendi ve arşive kaldırıldı!");
            this.renderActiveOrders();
        }
    },

    // Sipariş silme işlemi
    async deleteOrder(id) {
        if (UserManager.currentUser?.kullaniciAdi !== "İsmail Yıldırım") {
            alert("YETKİSİZ İŞLEM: Sipariş silme yetkisi yalnızca Finans Müdürü İsmail Yıldırım'a aittir!");
            return;
        }

        const siparisler = await DBService.getSiparisler();
        const targetOrder = siparisler.find(s => s.id === id);
        if (!targetOrder) return;

        const bNo = targetOrder.baglantiNo;

        if (confirm(`Bu siparişe bağlı tüm kalemleri (${bNo} Bağlantı No), ilişkili depo stok hareketlerini ve cari hesap hareketlerini kalıcı olarak silmek istediğinizden emin misiniz?`)) {
            // 1. Aynı Bağlantı Numarasına sahip tüm sipariş kalemlerini sil
            const ayniBaglantiSiparisleri = siparisler.filter(s => s.baglantiNo === bNo);
            for (let s of ayniBaglantiSiparisleri) {
                await DBService.deleteSiparis(s.id);
            }

            // 2. Stok hareketlerini sil
            const stokHars = await DBService.getStokHareketleri();
            const silinecekStokHars = stokHars.filter(h => h.aciklama && h.aciklama.includes(bNo));
            for (let h of silinecekStokHars) {
                await db.collection("erp_stok_hareketler").doc(h.id).delete();
            }

            // 3. Cari hareketlerini sil
            const cariHars = await DBService.getCariHareketler();
            const silinecekCariHars = cariHars.filter(h => h.aciklama && h.aciklama.includes(bNo));
            for (let h of silinecekCariHars) {
                await DBService.deleteCariHareket(h.id);
            }

            // 4. Mürabaha kredilerini sil
            const krediler = await DBService.getMurabahaKredileri();
            const silinecekKrediler = krediler.filter(k => k.aciklama && k.aciklama.includes(bNo));
            for (let k of silinecekKrediler) {
                await db.collection("erp_murabaha_kredileri").doc(k.id).delete();
                // Banka cari hareketlerini temizle (referansId ile)
                const bankaHars = cariHars.filter(h => h.referansId === k.id);
                for (let h of bankaHars) {
                    await DBService.deleteCariHareket(h.id);
                }
            }

            App.showToast("Sipariş bağlantısı ve ilişkili tüm finans/stok hareketleri başarıyla silindi.");
            
            // UI tazeleme
            const currentHash = window.location.hash.replace("#", "");
            if (currentHash === "aktif-siparisler") {
                this.renderActiveOrders();
            } else if (currentHash === "dashboard" || currentHash === "") {
                this.renderDashboard();
            } else {
                App.handleRouting();
            }
        }
    },

    // Sipariş detayını modalda göster
    async showOrderDetail(id) {
        const siparisler = await DBService.getSiparisler();
        const s = siparisler.find(x => x.id === id);
        if (!s) return;

        const body = document.getElementById("detail-modal-body");
        
        const kdvOrani = s.kdvOrani !== undefined ? s.kdvOrani : 20;
        const tevkifatOrani = s.tevkifatOrani !== undefined ? s.tevkifatOrani : 5;
        const matrah = s.matrah !== undefined ? s.matrah : (s.tutar / 1.1);
        const tevkifatKdv = s.tevkifatKdv !== undefined ? s.tevkifatKdv : (matrah * (kdvOrani/100) * (tevkifatOrani/10));

        body.innerHTML = `
            <div class="detail-grid">
                <span class="detail-label">Tedarikçi Firma:</span>
                <span class="detail-value">${s.firmaAdi}</span>
                
                <span class="detail-label">Bağlantı No:</span>
                <span class="detail-value">${s.baglantiNo}</span>
                
                <span class="detail-label">Sipariş Tarihi:</span>
                <span class="detail-value">${this.formatTarih(s.siparisTarihi)}</span>
                
                <span class="detail-label">Ödeme Tarihi (Vade):</span>
                <span class="detail-value" style="color:var(--status-yellow)">${this.formatTarih(s.vadeTarihi)}</span>
                
                <span class="detail-label">Matrah (KDV'siz):</span>
                <span class="detail-value">${this.formatTL(matrah)}</span>
                
                <span class="detail-label">Vergi Detayı:</span>
                <span class="detail-value">KDV %${kdvOrani} | Tevkifat: ${tevkifatOrani}/10</span>
                
                <span class="detail-label">Tevkifat KDV Tutarı:</span>
                <span class="detail-value" style="color:var(--status-yellow)">${this.formatTL(tevkifatKdv)}</span>
                
                <span class="detail-label">Cari Yekün Tutar:</span>
                <span class="detail-value" style="color:var(--accent-cyan); font-size:1.1rem; font-weight:700;">${this.formatTL(s.tutar)}</span>
                
                <span class="detail-label">Miktar:</span>
                <span class="detail-value">${this.formatKg(s.miktar)}</span>
                
                <span class="detail-label">Ürün Tanımı:</span>
                <span class="detail-value">${s.urunTanimi}</span>
                
                <span class="detail-label">Formu Giren:</span>
                <span class="detail-value">${s.ekleyenKullanici || 'Sistem'}</span>
                
                <span class="detail-label">Durum:</span>
                <span class="detail-value">
                    <span class="badge ${s.durum === 'Ödendi' ? 'badge-paid' : 'badge-active'}">
                        ${s.durum === 'Ödendi' ? 'Ödendi (Arşiv)' : 'Ödeme Bekliyor (Aktif)'}
                    </span>
                </span>
            </div>
            <button class="btn btn-secondary btn-block" onclick="App.closeDetailModal()">Kapat</button>
        `;
        document.getElementById("detail-modal").style.display = "flex";
        if (window.lucide) lucide.createIcons();
    },

    // Firma Carileri Listesi
    async renderCariler() {
        const container = document.getElementById("page-container");
        const siparisler = await DBService.getSiparisler();
        
        // Firmaları grupla
        const carilerMap = {};
        siparisler.forEach(s => {
            const normalizedKey = s.firmaAdi.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
            if (!carilerMap[normalizedKey]) {
                carilerMap[normalizedKey] = {
                    firmaAdi: s.firmaAdi.trim(), // Görüntülenecek ad olarak ilk kaydı kullan
                    toplamAlacak: 0, // Firmanın bizden alacağı (Toplam sipariş onayları)
                    toplamOdeme: 0,  // Bizim firmaya ödediğimiz (Ödendi olanlar)
                    bakiye: 0        // Bizim kalan borcumuz (Alacak - Ödeme)
                };
            }
            carilerMap[normalizedKey].toplamAlacak += s.tutar;
            if (s.durum === "Ödendi") {
                carilerMap[normalizedKey].toplamOdeme += s.tutar;
            }
            carilerMap[normalizedKey].bakiye = carilerMap[normalizedKey].toplamAlacak - carilerMap[normalizedKey].toplamOdeme;
        });

        const carilerList = Object.values(carilerMap);

        container.innerHTML = `
            <div class="glass-panel">
                <div class="table-header-actions">
                    <h3 style="font-family:var(--font-heading)">Tedarikçi Cari Hesap Takibi</h3>
                </div>
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Tedarikçi Firma Adı</th>
                            <th>Toplam Sipariş Hacmi (Alacağı)</th>
                            <th>Toplam Yapılan Ödeme</th>
                            <th>Güncel Kalan Borcumuz</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${carilerList.map(c => `
                            <tr>
                                <td style="font-weight:bold; color:var(--text-primary);">${c.firmaAdi}</td>
                                <td>${this.formatTL(c.toplamAlacak)}</td>
                                <td style="color:var(--status-green);">${this.formatTL(c.toplamOdeme)}</td>
                                <td style="font-weight:600; color:${c.bakiye > 0 ? 'var(--status-yellow)' : 'var(--status-green)'};">
                                    ${this.formatTL(c.bakiye)} 
                                    ${c.bakiye > 0 ? '<span style="font-size:0.75rem; font-weight:normal; color:var(--text-secondary)"> (Borçluyuz)</span>' : ''}
                                </td>
                                <td>
                                    <button class="btn btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="OrdersModule.renderCariDetail('${c.firmaAdi.replace(/'/g, "\\'")}')">
                                        <i data-lucide="eye" style="width:12px; height:12px; margin-right:4px;"></i> Ekstre Gör
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${carilerList.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary); padding:2rem;">Cari hesap hareketi bulunmuyor.</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    // Tek Bir Cari Detayı (Ekstre Dökümü)
    async renderCariDetail(firmaAdi) {
        const container = document.getElementById("page-container");
        const siparisler = await DBService.getSiparisler();
        
        // Bu firmaya ait siparişler
        const normalizedTarget = firmaAdi.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
        const firmaSiparisleri = siparisler.filter(s => s.firmaAdi.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR') === normalizedTarget);
        
        // İstatistikleri hesapla
        let toplamAlacak = 0;
        let toplamOdeme = 0;
        firmaSiparisleri.forEach(s => {
            toplamAlacak += s.tutar;
            if (s.durum === "Ödendi") {
                toplamOdeme += s.tutar;
            }
        });
        const bakiye = toplamAlacak - toplamOdeme;

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;" class="no-print">
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-secondary" onclick="OrdersModule.renderCariler()">
                        <i data-lucide="arrow-left"></i> Cariler Listesine Dön
                    </button>
                    <button class="btn btn-primary" onclick="window.print()" style="background:linear-gradient(135deg, var(--accent-blue), var(--accent-cyan));">
                        <i data-lucide="printer"></i> Ekstre Yazdır
                    </button>
                </div>
                <h2 style="font-family:var(--font-heading); color:var(--accent-cyan);">${firmaAdi} Ekstresi</h2>
            </div>
            
            <!-- Yazıcı Çıktısı İçin Görünür Başlık -->
            <div class="print-only" style="margin-bottom:20px; text-align:center;">
                <h1 style="color:#000; font-family:var(--font-heading);">${firmaAdi} Cari Ekstre Dökümü</h1>
                <p style="color:#666; font-size:0.85rem;">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
            </div>

            <!-- Cari Özet Kartları -->
            <div class="kpi-grid" style="margin-bottom:2rem;">
                <div class="glass-panel kpi-card">
                    <div class="kpi-card-header">
                        <span>Toplam Sipariş (Alacağı)</span>
                        <i data-lucide="shopping-bag"></i>
                    </div>
                    <div class="kpi-card-value">${this.formatTL(toplamAlacak)}</div>
                </div>
                <div class="glass-panel kpi-card" style="border-color: rgba(16, 185, 129, 0.2)">
                    <div class="kpi-card-header">
                        <span>Toplam Yapılan Ödeme</span>
                        <i data-lucide="check-circle" style="color:var(--status-green)"></i>
                    </div>
                    <div class="kpi-card-value" style="color:var(--status-green)">${this.formatTL(toplamOdeme)}</div>
                </div>
                <div class="glass-panel kpi-card" style="border-color: ${bakiye > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}">
                    <div class="kpi-card-header">
                        <span>Güncel Borç Bakiyemiz</span>
                        <i data-lucide="credit-card" style="color:${bakiye > 0 ? 'var(--status-yellow)' : 'var(--status-green)'}"></i>
                    </div>
                    <div class="kpi-card-value" style="color:${bakiye > 0 ? 'var(--status-yellow)' : 'var(--status-green)'}">${this.formatTL(bakiye)}</div>
                    <div class="kpi-card-footer">${bakiye > 0 ? 'Firmaya kalan borcumuz' : 'Tüm borçlar ödendi'}</div>
                </div>
            </div>

            <div class="glass-panel" style="padding:1.5rem;">
                <h3 style="margin-bottom:1rem; font-family:var(--font-heading)">Hesap Hareketleri</h3>
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Bağlantı No</th>
                            <th>İşlem Detayı</th>
                            <th>Borç (Yapılan Ödeme)</th>
                            <th>Alacak (Sipariş Onayı)</th>
                            <th>İşlem Durumu</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${firmaSiparisleri.map(s => {
                            // Alacak satırı (Sipariş oluştu)
                            let rowsHtml = `
                                <tr>
                                    <td>${this.formatTarih(s.siparisTarihi)}</td>
                                    <td style="font-weight:bold;"><span class="clickable-link" onclick="OrdersModule.showOrderDetail('${s.id}')">${s.baglantiNo}</span></td>
                                    <td>Sipariş Bağlantı Onayı (${s.urunTanimi})</td>
                                    <td>-</td>
                                    <td style="font-weight:600;">${this.formatTL(s.tutar)}</td>
                                    <td><span class="badge badge-active">Sipariş Alındı</span></td>
                                </tr>
                            `;
                            // Eğer ödendiyse bir de borç satırı ekle (Ödeme yapıldı)
                            if (s.durum === "Ödendi") {
                                rowsHtml += `
                                    <tr>
                                        <td>${this.formatTarih(s.vadeTarihi)}</td>
                                        <td style="font-weight:bold;"><span class="clickable-link" onclick="OrdersModule.showOrderDetail('${s.id}')">${s.baglantiNo}</span></td>
                                        <td>Sipariş Ödemesi Kapatıldı</td>
                                        <td style="font-weight:600; color:var(--status-green);">${this.formatTL(s.tutar)}</td>
                                        <td>-</td>
                                        <td><span class="badge badge-paid">Ödeme Yapıldı</span></td>
                                    </tr>
                                `;
                            }
                            return rowsHtml;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    // 📊 Profesyonel Raporlama Sayfası Render Motoru
    monthlyChartInstance: null,
    supplierChartInstance: null,

    async renderRaporlar() {
        const container = document.getElementById("page-container");
        const siparisler = await DBService.getSiparisler();
        
        // Benzersiz firmaları al (Filtre için)
        const firmalar = [...new Set(siparisler.map(s => s.firmaAdi))];

        container.innerHTML = `
            <!-- 🔍 Dinamik Filtreleme Paneli -->
            <div class="glass-panel no-print" style="margin-bottom: 1.5rem;">
                <div class="reports-filter-grid">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label" style="font-size:0.75rem;">Başlangıç Tarihi</label>
                        <input type="date" id="report-start-date" class="form-control" style="padding:0.5rem;" onchange="OrdersModule.applyFilters()">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label" style="font-size:0.75rem;">Bitiş Tarihi</label>
                        <input type="date" id="report-end-date" class="form-control" style="padding:0.5rem;" onchange="OrdersModule.applyFilters()">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label" style="font-size:0.75rem;">Tedarikçi Firma</label>
                        <select id="report-firma-select" class="form-control select-glass" style="padding:0.5rem; height:37px;" onchange="OrdersModule.applyFilters()">
                            <option value="">Tüm Firmalar</option>
                            ${firmalar.map(f => `<option value="${f}">${f}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label" style="font-size:0.75rem;">Sipariş Durumu</label>
                        <select id="report-status-select" class="form-control select-glass" style="padding:0.5rem; height:37px;" onchange="OrdersModule.applyFilters()">
                            <option value="">Tüm Siparişler</option>
                            <option value="Aktif">Aktif (Ödeme Bekleyen)</option>
                            <option value="Gecikmiş">Gecikmiş</option>
                            <option value="Ödendi">Ödendi (Arşiv)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 📊 Grafik Izgarası -->
            <div class="chart-grid no-print">
                <div class="glass-panel chart-card">
                    <h4>Aylık Sipariş Hacimleri (TL)</h4>
                    <div class="chart-wrapper">
                        <canvas id="monthly-chart"></canvas>
                    </div>
                </div>
                <div class="glass-panel chart-card">
                    <h4>Tedarikçi Dağılımı</h4>
                    <div class="chart-wrapper">
                        <canvas id="supplier-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- 📥 Rapor İstatistik Kartları ve Rapor Tablosu -->
            <div id="report-results-area">
                <!-- applyFilters tarafından dinamik yüklenecektir -->
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        
        // Filtreleri ilk kez çalıştır
        this.applyFilters();
    },

    // Filtreleri Uygula ve Arayüzü Güncelle
    async applyFilters() {
        const startDateVal = document.getElementById("report-start-date").value;
        const endDateVal = document.getElementById("report-end-date").value;
        const selectedFirma = document.getElementById("report-firma-select").value;
        const selectedStatus = document.getElementById("report-status-select").value;

        let siparisler = await DBService.getSiparisler();
        const bugun = new Date();
        bugun.setHours(0,0,0,0);

        // Tarih filtresi uygula
        if (startDateVal) {
            const start = new Date(startDateVal);
            siparisler = siparisler.filter(s => new Date(s.siparisTarihi) >= start);
        }
        if (endDateVal) {
            const end = new Date(endDateVal);
            siparisler = siparisler.filter(s => new Date(s.siparisTarihi) <= end);
        }

        // Firma filtresi uygula
        if (selectedFirma) {
            siparisler = siparisler.filter(s => s.firmaAdi === selectedFirma);
        }

        // Durum filtresi uygula
        if (selectedStatus) {
            if (selectedStatus === "Ödendi") {
                siparisler = siparisler.filter(s => s.durum === "Ödendi");
            } else if (selectedStatus === "Gecikmiş") {
                siparisler = siparisler.filter(s => {
                    if (s.durum === "Ödendi") return false;
                    const vade = new Date(s.vadeTarihi);
                    vade.setHours(0,0,0,0);
                    return vade < bugun;
                });
            } else if (selectedStatus === "Aktif") {
                siparisler = siparisler.filter(s => {
                    if (s.durum === "Ödendi") return false;
                    const vade = new Date(s.vadeTarihi);
                    vade.setHours(0,0,0,0);
                    return vade >= bugun;
                });
            }
        }

        // İstatistikleri hesapla
        let toplamAlacak = 0;
        let toplamOdeme = 0;
        siparisler.forEach(s => {
            toplamAlacak += s.tutar;
            if (s.durum === "Ödendi") {
                toplamOdeme += s.tutar;
            }
        });
        const kalanBorc = toplamAlacak - toplamOdeme;

        // Grafik verilerini hesapla ve grafikleri çiz
        this.initCharts(siparisler);

        const resultsArea = document.getElementById("report-results-area");
        resultsArea.innerHTML = `
            <!-- Yazıcıda görünecek başlık -->
            <div class="print-only" style="margin-bottom:20px; text-align:center;">
                <h1 style="color:#000;">Sipariş Takip &amp; Cari Analiz Raporu</h1>
                <p style="color:#666; font-size:0.85rem;">Filtreler: ${selectedFirma ? selectedFirma : 'Tüm Firmalar'} | ${selectedStatus ? selectedStatus : 'Tüm Durumlar'}</p>
                <p style="color:#666; font-size:0.85rem;">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
            </div>

            <!-- Rapor KPI Kartları -->
            <div class="kpi-grid" style="margin-bottom: 1.5rem;">
                <div class="glass-panel kpi-card">
                    <div class="kpi-card-header">
                        <span>Raporlanan Sipariş Hacmi</span>
                        <i data-lucide="shopping-bag" style="color:var(--accent-cyan)"></i>
                    </div>
                    <div class="kpi-card-value">${this.formatTL(toplamAlacak)}</div>
                    <div class="kpi-card-footer">${siparisler.length} adet fiş / onay formu</div>
                </div>
                <div class="glass-panel kpi-card" style="border-color:rgba(16, 185, 129, 0.2)">
                    <div class="kpi-card-header">
                        <span>Yapılan Ödeme Toplamı</span>
                        <i data-lucide="check-circle" style="color:var(--status-green)"></i>
                    </div>
                    <div class="kpi-card-value" style="color:var(--status-green)">${this.formatTL(toplamOdeme)}</div>
                </div>
                <div class="glass-panel kpi-card" style="border-color:${kalanBorc > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}">
                    <div class="kpi-card-header">
                        <span>Filtrelenmiş Kalan Borç</span>
                        <i data-lucide="credit-card" style="color:${kalanBorc > 0 ? 'var(--status-red)' : 'var(--status-green)'}"></i>
                    </div>
                    <div class="kpi-card-value" style="color:${kalanBorc > 0 ? 'var(--status-red)' : 'var(--status-green)'}">${this.formatTL(kalanBorc)}</div>
                </div>
            </div>

            <!-- Tablo Paneli -->
            <div class="glass-panel" style="padding:1.5rem;">
                <div class="table-header-actions" style="border:none; padding:0 0 1.25rem 0;">
                    <h3 style="font-family:var(--font-heading)">Rapor Tablosu</h3>
                    <div style="display:flex; gap:10px;" class="no-print">
                        <button class="btn btn-secondary" onclick="OrdersModule.exportRaporToCSV()">
                            <i data-lucide="file-spreadsheet"></i> Excel (CSV) İndir
                        </button>
                        <button class="btn btn-primary" onclick="window.print()" style="background:linear-gradient(135deg, var(--accent-blue), var(--accent-cyan));">
                            <i data-lucide="printer"></i> PDF / Rapor Yazdır
                        </button>
                    </div>
                </div>
                <table class="data-grid" id="report-table">
                    <thead>
                        <tr>
                            <th>Bağlantı No</th>
                            <th>Firma Adı</th>
                            <th>Sipariş Tarihi</th>
                            <th>Vade Tarihi</th>
                            <th>Ürün Tanımı</th>
                            <th>Miktar</th>
                            <th>Tutar</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${siparisler.map(s => {
                            const vade = new Date(s.vadeTarihi);
                            vade.setHours(0,0,0,0);
                            const isOverdue = s.durum !== "Ödendi" && vade < bugun;

                            return `
                                <tr>
                                    <td style="font-weight:bold;"><span class="clickable-link" onclick="OrdersModule.showOrderDetail('${s.id}')">${s.baglantiNo}</span></td>
                                    <td>${s.firmaAdi}</td>
                                    <td>${this.formatTarih(s.siparisTarihi)}</td>
                                    <td>${this.formatTarih(s.vadeTarihi)}</td>
                                    <td>${s.urunTanimi}</td>
                                    <td>${this.formatKg(s.miktar)}</td>
                                    <td style="font-weight:600;">${this.formatTL(s.tutar)}</td>
                                    <td>
                                        <span class="badge ${s.durum === 'Ödendi' ? 'badge-paid' : (isOverdue ? 'badge-overdue' : 'badge-active')}">
                                            ${s.durum === 'Ödendi' ? 'Ödendi' : (isOverdue ? 'Gecikmiş' : 'Aktif')}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                        ${siparisler.length === 0 ? `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary);">Filtrelere uygun rapor kaydı bulunamadı.</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    // 📈 Chart.js ile Grafik Çizimleri
    initCharts(siparisler) {
        // --- 1. AYLIK SİPARİŞ DAĞILIMI (Bar Grafik) ---
        const monthlyData = {};
        siparisler.forEach(s => {
            if (s.siparisTarihi) {
                const date = new Date(s.siparisTarihi);
                const monthName = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
                if (!monthlyData[monthName]) monthlyData[monthName] = 0;
                monthlyData[monthName] += s.tutar;
            }
        });

        const months = Object.keys(monthlyData);
        const amounts = Object.values(monthlyData);

        const ctx1 = document.getElementById("monthly-chart");
        if (ctx1) {
            if (this.monthlyChartInstance) this.monthlyChartInstance.destroy();
            this.monthlyChartInstance = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Sipariş Tutarı (TL)',
                        data: amounts,
                        backgroundColor: 'rgba(6, 182, 212, 0.45)',
                        borderColor: '#06b6d4',
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });
        }

        // --- 2. TEDARİKÇİ DAĞILIMI (Doughnut Grafik) ---
        const supplierData = {};
        siparisler.forEach(s => {
            if (!supplierData[s.firmaAdi]) supplierData[s.firmaAdi] = 0;
            supplierData[s.firmaAdi] += s.tutar;
        });

        const suppliers = Object.keys(supplierData);
        const supplierAmounts = Object.values(supplierData);

        const ctx2 = document.getElementById("supplier-chart");
        if (ctx2) {
            if (this.supplierChartInstance) this.supplierChartInstance.destroy();
            this.supplierChartInstance = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: suppliers,
                    datasets: [{
                        data: supplierAmounts,
                        backgroundColor: [
                            'rgba(2, 132, 199, 0.65)',
                            'rgba(6, 182, 212, 0.65)',
                            'rgba(16, 185, 129, 0.65)',
                            'rgba(245, 158, 11, 0.65)',
                            'rgba(239, 68, 68, 0.65)',
                            'rgba(139, 92, 246, 0.65)'
                        ],
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#94a3b8', font: { size: 10 } }
                        }
                    }
                }
            });
        }
    },

    // 📥 Excel (CSV) Dışa Aktarma
    exportRaporToCSV() {
        const table = document.getElementById("report-table");
        if (!table) return;

        let csv = [];
        const rows = table.querySelectorAll("tr");
        
        for (let i = 0; i < rows.length; i++) {
            const row = [], cols = rows[i].querySelectorAll("td, th");
            
            for (let j = 0; j < cols.length; j++) {
                // Link içindeki metni temizlemek veya HTML elementlerinden arındırmak
                let text = cols[j].innerText.trim();
                text = text.replace(/"/g, '""'); // Çift tırnak kaçışı
                row.push('"' + text + '"');
            }
            csv.push(row.join(";")); // Excel Türkiye standartlarında noktalı virgül kullanılır
        }

        // BOM karakteri ekle (Türkçe karakterlerin Excel'de bozulmasını önlemek için)
        const csvContent = "\ufeff" + csv.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `siparis_takip_raporu_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
