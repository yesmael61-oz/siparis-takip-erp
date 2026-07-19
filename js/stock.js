// 📦 Stok Depo & Envanter Yönetimi (stock.js)
const StockModule = {
    selectedStockId: null,

    async renderStockInventory() {
        const container = document.getElementById("page-container");
        const stoklar = await DBService.getStokKartlari();
        const hareketler = await DBService.getStokHareketleri();

        // Her stok kartının güncel kalan miktarını ve ortalama maliyetini hesapla
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
            s.ortalamaMaliyet = miktar > 0 ? (toplamMaliyet / (s.baslangicMiktar || 0 + urunHars.filter(h => h.hareketTipi === "Giriş").reduce((sum, h) => sum + h.miktar, 0) || 1)) : 0;
        });

        // Alfabetik sıralama (A-Z)
        stoklar.sort((a, b) => a.urunAdi.localeCompare(b.urunAdi, 'tr'));

        const totalStockValue = stoklar.reduce((sum, s) => sum + (s.miktar * s.ortalamaMaliyet), 0);

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:1.5rem; height:calc(100vh - 160px);">
                <!-- Envanter Durum Kartı -->
                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:1.25rem;">
                    <div class="glass-panel" style="padding:1.25rem; display:flex; flex-direction:column;">
                        <span style="font-size:0.75rem; color:var(--text-secondary);">TOPLAM ENVANTER DEĞERİ</span>
                        <h2 style="font-family:var(--font-heading); font-size:1.6rem; font-weight:800; color:var(--accent-cyan); margin-top:0.5rem;">
                            ${this.formatMoney(totalStockValue)}
                        </h2>
                    </div>
                    <div class="glass-panel" style="padding:1.25rem; display:flex; flex-direction:column;">
                        <span style="font-size:0.75rem; color:var(--text-secondary);">DEPO DEMİR HAKKI (TOPLAM)</span>
                        <h2 style="font-family:var(--font-heading); font-size:1.6rem; font-weight:800; color:var(--text-primary); margin-top:0.5rem;">
                            ${(stoklar.reduce((sum, s) => sum + s.miktar, 0) / 1000).toFixed(2)} Ton
                        </h2>
                    </div>
                    <div class="glass-panel" style="padding:1.25rem; display:flex; flex-direction:column; justify-content:center; align-items:flex-end;">
                        <button class="btn btn-primary" onclick="StockModule.openStockCardModal()">
                            <i data-lucide="plus-circle"></i> Yeni Ürün Kartı Aç
                        </button>
                    </div>
                    <div class="glass-panel" style="padding:1.25rem; display:flex; flex-direction:column; justify-content:center; align-items:flex-end;">
                        <button class="btn btn-secondary" onclick="StockModule.openStockMovementModal()">
                            <i data-lucide="arrow-left-right"></i> Manuel Stok Giriş/Çıkış
                        </button>
                    </div>
                </div>

                <!-- Alt Bölüm: Stok Envanter Listesi ve Hareket Dökümü -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; flex-grow:1; overflow:hidden;">
                    <!-- Sol: Stok Kartları -->
                    <div class="glass-panel" style="padding:1.5rem; display:flex; flex-direction:column; overflow-y:auto;">
                        <h3 style="font-family:var(--font-heading); margin-bottom:1rem; font-size:1.2rem;">Envanter Listesi</h3>
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Ürün Adı</th>
                                    <th>Birim</th>
                                    <th>Mevcut Envanter (Miktar)</th>
                                    <th>Ort. Maliyet (TL)</th>
                                    <th>Toplam Değer (TL)</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stoklar.map(s => `
                                    <tr>
                                        <td style="font-weight:700;">${s.urunAdi}</td>
                                        <td>${s.birim}</td>
                                        <td style="font-weight:800; color:var(--text-primary);">${s.miktar.toLocaleString('tr-TR')} ${s.birim}</td>
                                        <td>${this.formatMoney(s.ortalamaMaliyet * 1000)}</td>
                                        <td style="font-weight:800; color:var(--accent-cyan);">${this.formatMoney(s.miktar * s.ortalamaMaliyet)}</td>
                                        <td>
                                            <div style="display:flex; gap:6px;">
                                                <button class="logout-btn" style="padding:2px; margin:0;" onclick="StockModule.openStockCardEdit('${s.id}')" title="Düzenle">
                                                    <i data-lucide="edit-2" style="width:12px; height:12px; color:var(--accent-cyan);"></i>
                                                </button>
                                                <button class="logout-btn" style="padding:2px; margin:0;" onclick="StockModule.deleteStockCard('${s.id}')" title="Sil">
                                                    <i data-lucide="trash-2" style="width:12px; height:12px; color:var(--status-red);"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${stoklar.length === 0 ? `
                                    <tr>
                                        <td colspan="5" style="text-align:center; color:var(--text-secondary); padding:2rem;">Kayıtlı stok kartı bulunmuyor.</td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>

                    <!-- Sağ: Son Stok Hareketleri -->
                    <div class="glass-panel" style="padding:1.5rem; display:flex; flex-direction:column; overflow-y:auto;">
                        <h3 style="font-family:var(--font-heading); margin-bottom:1rem; font-size:1.2rem;">Son Stok Hareketleri (Depo Dökümü)</h3>
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Ürün</th>
                                    <th>Tür</th>
                                    <th>Miktar</th>
                                    <th>Birim Fiyat</th>
                                    <th>Evrak Açıklama</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                 ${hareketler.sort((a,b) => new Date(a.tarih) - new Date(b.tarih)).map(h => {
                                    const urun = stoklar.find(s => s.id === h.urunId);
                                    return `
                                        <tr>
                                            <td>${new Date(h.tarih).toLocaleDateString('tr-TR')}</td>
                                            <td style="font-weight:700;">${urun ? urun.urunAdi : 'Ürün Silinmiş'}</td>
                                            <td><span class="badge ${h.hareketTipi === 'Giriş' ? 'badge-paid' : 'badge-overdue'}">${h.hareketTipi}</span></td>
                                            <td style="font-weight:700;">${h.miktar.toLocaleString('tr-TR')}</td>
                                            <td>${this.formatMoney(h.birimFiyat * 1000)}</td>
                                            <td>${h.aciklama || '-'}</td>
                                            <td>
                                                <button class="logout-btn" style="padding:4px; margin:0;" onclick="StockModule.deleteStockMovement('${h.id}')" title="Hareketi Sil">
                                                    <i data-lucide="x" style="width:12px; height:12px; color:var(--status-red);"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${hareketler.length === 0 ? `
                                    <tr>
                                        <td colspan="6" style="text-align:center; color:var(--text-secondary); padding:2rem;">Depo envanter hareketi bulunmuyor.</td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    formatMoney(val) {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
    },

    // --- YENİ STOK KARTI ---
    openStockCardModal() {
        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "stok-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Yeni Stok Kartı Oluştur</h3>
                    <button class="modal-close" onclick="document.getElementById('stok-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="StockModule.handleStockCardSubmit(event)">
                    <div class="form-group">
                        <label>Ürün / Demir Tanımı</label>
                        <input type="text" id="stok-urunadi" class="form-control" placeholder="Örn: 12'lik İnşaat Demiri" required>
                    </div>
                    <div class="form-group">
                        <label>Ölçü Birimi</label>
                        <select id="stok-birim" class="form-control" required>
                            <option value="kg">kg (Kilogram)</option>
                            <option value="ton">ton</option>
                            <option value="Adet">Adet</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Başlangıç Envanter Miktarı</label>
                            <input type="number" id="stok-basmiktar" class="form-control" value="0" required>
                        </div>
                        <div class="form-group">
                            <label>Başlangıç Ortalama Maliyeti (₺)</label>
                            <input type="number" step="0.01" id="stok-basmaliyet" class="form-control" value="0" required>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('stok-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">Kartı Aç</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    async handleStockCardSubmit(e) {
        e.preventDefault();
        const urunAdi = document.getElementById("stok-urunadi").value.trim();
        const birim = document.getElementById("stok-birim").value;
        const basMiktar = parseFloat(document.getElementById("stok-basmiktar").value) || 0;
        const basMaliyet = parseFloat(document.getElementById("stok-basmaliyet").value) || 0;

        if (!urunAdi) return;

        const newStock = {
            urunAdi: urunAdi,
            birim: birim,
            baslangicMiktar: basMiktar,
            baslangicMaliyet: basMaliyet,
            miktar: basMiktar,
            ortalamaMaliyet: basMaliyet
        };

        await DBService.addStokKarti(newStock);
        document.getElementById("stok-modal").remove();
        App.showToast("Yeni envanter stok kartı başarıyla tanımlandı.");
        this.renderStockInventory();
    },

    // --- MANUEL STOK HAREKET GİRİŞİ ---
    async openStockMovementModal() {
        const stoklar = await DBService.getStokKartlari();
        if (stoklar.length === 0) {
            alert("HATA: Önce en az bir ürün envanter stok kartı tanımlamalısınız!");
            return;
        }

        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "mvt-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Stok Giriş / Çıkış Hareketi İşle</h3>
                    <button class="modal-close" onclick="document.getElementById('mvt-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="StockModule.handleStockMovementSubmit(event)">
                    <div class="form-group">
                        <label>Hareket Yapılacak Ürün</label>
                        <select id="mvt-urun" class="form-control" required>
                            ${stoklar.map(s => `<option value="${s.id}">${s.urunAdi}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Hareket Tipi</label>
                        <select id="mvt-tip" class="form-control" required>
                            <option value="Giriş">Depo Giriş (Alım / Transfer vb.)</option>
                            <option value="Çıkış">Depo Çıkış (Satış / Fire vb.)</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>İşlem Miktarı</label>
                            <input type="number" id="mvt-miktar" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Birim Alım/Satış Fiyatı (₺)</label>
                            <input type="number" step="0.01" id="mvt-fiyat" class="form-control" placeholder="0.00" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>İşlem Tarihi</label>
                        <input type="date" id="mvt-tarih" class="form-control" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Açıklama / Fiş No</label>
                        <input type="text" id="mvt-aciklama" class="form-control" placeholder="Örn: Manuel alım faturası girisi vb.">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('mvt-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">İşlemi Tamamla</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    async handleStockMovementSubmit(e) {
        e.preventDefault();
        const urunId = document.getElementById("mvt-urun").value;
        const hareketTipi = document.getElementById("mvt-tip").value;
        const miktar = parseFloat(document.getElementById("mvt-miktar").value);
        const birimFiyat = parseFloat(document.getElementById("mvt-fiyat").value);
        const tarih = document.getElementById("mvt-tarih").value;
        const aciklama = document.getElementById("mvt-aciklama").value.trim();

        if (isNaN(miktar) || miktar <= 0) return;

        const newMovement = {
            urunId: urunId,
            hareketTipi: hareketTipi,
            miktar: miktar,
            birimFiyat: birimFiyat / 1000,
            tarih: tarih,
            aciklama: aciklama
        };

        await DBService.addStokHareket(newMovement);
        document.getElementById("mvt-modal").remove();
        App.showToast("Depo stok hareketi başarıyla işlendi.");
        this.renderStockInventory();
    },

    async deleteStockMovement(id) {
        if (confirm("Bu stok hareket kaydını silmek istediğinize emin misiniz?")) {
            await db.collection("erp_stok_hareketler").doc(id).delete();
            App.showToast("Stok hareket kaydı silindi.");
            this.renderStockInventory();
        }
    },

    async deleteStockCard(id) {
        if (confirm("Bu stok kartını ve ona bağlı tüm stok hareketlerini silmek istediğinize emin misiniz?")) {
            await db.collection("erp_stok").doc(id).delete();
            
            // Bağlı hareketleri sil
            const hareketler = await DBService.getStokHareketleri();
            const baglilar = hareketler.filter(h => h.urunId === id);
            for (let h of baglilar) {
                await db.collection("erp_stok_hareketler").doc(h.id).delete();
            }
            
            App.showToast("Stok envanter kartı ve hareketleri başarıyla temizlendi.");
            this.renderStockInventory();
        }
    },

    async openStockCardEdit(id) {
        const stoklar = await DBService.getStokKartlari();
        const stok = stoklar.find(s => s.id === id);
        if (!stok) return;

        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "stok-edit-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Stok Kartını Düzenle</h3>
                    <button class="modal-close" onclick="document.getElementById('stok-edit-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="StockModule.handleStockCardEditSubmit(event, '${id}')">
                    <div class="form-group">
                        <label>Ürün / Demir Tanımı</label>
                        <input type="text" id="stok-edit-urunadi" class="form-control" value="${stok.urunAdi}" required>
                    </div>
                    <div class="form-group">
                        <label>Ölçü Birimi</label>
                        <select id="stok-edit-birim" class="form-control" required>
                            <option value="kg" ${stok.birim === 'kg' ? 'selected' : ''}>kg (Kilogram)</option>
                            <option value="ton" ${stok.birim === 'ton' ? 'selected' : ''}>ton</option>
                            <option value="Adet" ${stok.birim === 'Adet' ? 'selected' : ''}>Adet</option>
                        </select>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('stok-edit-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">Güncelle</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    async handleStockCardEditSubmit(e, id) {
        e.preventDefault();
        const urunAdi = document.getElementById("stok-edit-urunadi").value.trim();
        const birim = document.getElementById("stok-edit-birim").value;

        if (!urunAdi) return;

        await DBService.updateStokKarti(id, {
            urunAdi: urunAdi.toUpperCase(),
            birim: birim
        });

        document.getElementById("stok-edit-modal").remove();
        App.showToast("Stok kartı başarıyla güncellendi.");
        this.renderStockInventory();
    }
};
