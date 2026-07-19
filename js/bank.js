// 🏦 Banka & Mürabaha Finansman Yönetimi (bank.js)
const BankModule = {
    selectedBankId: null,

    async renderBankAccounts() {
        const container = document.getElementById("page-container");
        const bankalar = await DBService.getBankalar();
        const krediler = await DBService.getMurabahaKredileri();
        const cariler = await DBService.getCariler();

        // Bankaların cari hesap eşleşmelerini ve bakiye hesaplarını al
        // Banka bakiyesi = banka hesabı üzerinden yapılan giriş/çıkış hareketleri
        // Basitlik ve tam entegrasyon için: Bankaları da cari kart olarak açarız ve bakiyeyi oradan çekeriz!
        
        bankalar.sort((a, b) => a.hesapAdi.localeCompare(b.hesapAdi, 'tr'));
        
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:320px 1fr; gap:1.5rem; height:calc(100vh - 160px);">
                <!-- Sol: Banka / Kasa Hesapları -->
                <div class="glass-panel" style="padding:1.25rem; display:flex; flex-direction:column; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="font-family:var(--font-heading); font-size:1.1rem;">Banka & Kasalar</h3>
                        <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.75rem;" onclick="BankModule.openBankModal()">
                            <i data-lucide="plus-circle" style="width:12px; height:12px;"></i> Yeni Hesap
                        </button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.65rem;" id="bank-list-items">
                        ${bankalar.map(b => `
                            <div class="profile-card" style="padding:1rem; border-radius:12px; flex-direction:column; align-items:flex-start; width:100%; gap:4px;">
                                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                                    <strong style="font-size:0.9rem; color:var(--text-primary);"><i data-lucide="landmark" style="width:14px; height:14px; margin-right:6px; color:var(--accent-cyan);"></i>${b.hesapAdi}</strong>
                                    <button class="logout-btn" style="padding:2px; margin:0;" onclick="BankModule.deleteBanka('${b.id}')">
                                        <i data-lucide="trash-2" style="width:12px; height:12px; color:var(--status-red);"></i>
                                    </button>
                                </div>
                                <span style="font-size:0.7rem; color:var(--text-secondary); word-break:break-all;">${b.iban || 'Nakit Kasa'}</span>
                                <div style="font-family:var(--font-heading); font-size:1.05rem; font-weight:800; color:var(--accent-cyan); margin-top:0.35rem;">
                                    ${this.formatMoney(b.bakiye || 0)}
                                </div>
                            </div>
                        `).join('')}
                        ${bankalar.length === 0 ? `
                            <div style="text-align:center; padding:2rem; color:var(--text-secondary); font-size:0.8rem;">Tanımlı banka hesabı yok.</div>
                        ` : ''}
                    </div>
                </div>

                <!-- Sağ: Mürabaha Geri Ödeme Listesi -->
                <div class="glass-panel" style="padding:1.5rem; display:flex; flex-direction:column; overflow-y:auto;">
                    <div class="statement-header">
                        <div>
                            <h2 class="statement-title" style="font-size:1.4rem;">Mürabaha Alım Kredileri</h2>
                            <span style="font-size:0.8rem; color:var(--text-secondary);">Katılım bankalarından kullanılan vadeli hammadde finansmanları</span>
                        </div>
                        <button class="btn btn-primary" onclick="BankModule.openMurabahaModal()">
                            <i data-lucide="plus-circle"></i> Yeni Mürabaha Kullanımı
                        </button>
                    </div>

                    <!-- Mürabaha Tablosu -->
                    <div style="flex-grow:1; overflow-y:auto;">
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Finansman Bankası</th>
                                    <th>Mal Bedeli (Piyasa)</th>
                                    <th>Kâr Payı (Faiz)</th>
                                    <th>Toplam Borç</th>
                                    <th>Vade Tarihi</th>
                                    <th>Kalan Gün</th>
                                    <th>Durum</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${krediler.sort((a,b) => new Date(a.vadeTarihi) - new Date(b.vadeTarihi)).map(k => {
                                    const kalanGun = Math.ceil((new Date(k.vadeTarihi) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                                    const banka = cariler.find(c => c.id === k.bankaCariId);
                                    
                                    return `
                                        <tr>
                                            <td>${new Date(k.tarih).toLocaleDateString('tr-TR')}</td>
                                            <td style="font-weight:700;">${banka ? banka.unvan : 'Banka Silinmiş'}</td>
                                            <td>${this.formatMoney(k.malBedeli)}</td>
                                            <td style="color:var(--status-yellow);">${this.formatMoney(k.karPayi)}</td>
                                            <td style="font-weight:800; color:var(--text-primary);">${this.formatMoney(k.toplamBorc)}</td>
                                            <td style="font-weight:600;">${new Date(k.vadeTarihi).toLocaleDateString('tr-TR')}</td>
                                            <td>
                                                ${k.durum === 'Ödendi' ? '-' : 
                                                  kalanGun < 0 ? `<span style="color:var(--status-red); font-weight:700;">Gecikti (${Math.abs(kalanGun)} Gün)</span>` : 
                                                  kalanGun <= 3 ? `<span style="color:var(--status-red); font-weight:700;">Kritik (${kalanGun} Gün)</span>` : 
                                                  `<span style="color:var(--text-secondary);">${kalanGun} Gün</span>`
                                                }
                                            </td>
                                            <td>
                                                <span class="badge ${k.durum === 'Ödendi' ? 'badge-paid' : 'badge-overdue'}">
                                                    ${k.durum}
                                                </span>
                                            </td>
                                            <td>
                                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                                    ${k.durum !== 'Ödendi' ? `
                                                        <button class="btn btn-primary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="BankModule.payMurabaha('${k.id}')">
                                                            Öde
                                                        </button>
                                                    ` : ''}
                                                    <button class="logout-btn" style="padding:4px; margin:0;" onclick="BankModule.openMurabahaEdit('${k.id}')" title="Düzenle">
                                                        <i data-lucide="edit-2" style="width:12px; height:12px; color:var(--accent-cyan);"></i>
                                                    </button>
                                                    <button class="logout-btn" style="padding:4px; margin:0;" onclick="BankModule.deleteMurabaha('${k.id}')" title="Sil">
                                                        <i data-lucide="trash-2" style="width:12px; height:12px; color:var(--status-red);"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${krediler.length === 0 ? `
                                    <tr>
                                        <td colspan="9" style="text-align:center; color:var(--text-secondary); padding:2rem;">Kayıtlı mürabaha kullanımı bulunmuyor.</td>
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

    // --- BANKA EKLEME ---
    openBankModal() {
        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "bank-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Yeni Banka / Kasa Hesabı Tanımla</h3>
                    <button class="modal-close" onclick="document.getElementById('bank-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="BankModule.handleBankSubmit(event)">
                    <div class="form-group">
                        <label>Hesap Adı</label>
                        <input type="text" id="bank-hesapadi" class="form-control" placeholder="Örn: Kuveyt Türk Ticari" required>
                    </div>
                    <div class="form-group">
                        <label>IBAN Numarası / Kasa Açıklaması</label>
                        <input type="text" id="bank-iban" class="form-control" placeholder="TR..." required>
                    </div>
                    <div class="form-group">
                        <label>Başlangıç Bakiyesi (₺)</label>
                        <input type="number" step="0.01" id="bank-bakiye" class="form-control" placeholder="0.00" value="0">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('bank-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">Kaydet</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    async handleBankSubmit(e) {
        e.preventDefault();
        const hesapAdi = document.getElementById("bank-hesapadi").value.trim();
        const iban = document.getElementById("bank-iban").value.trim();
        const bakiye = parseFloat(document.getElementById("bank-bakiye").value) || 0;

        // 1. Bankayı Bankalar tablosuna ekle
        const newBank = {
            hesapAdi: hesapAdi,
            iban: iban,
            bakiye: bakiye
        };
        const res = await DBService.addBanka(newBank);

        // 2. Bankayı aynı zamanda borç-alacak durumunu takip etmek için Cari Hesap olarak da ekle!
        const newCari = {
            unvan: hesapAdi + " (Banka)",
            telefon: iban,
            tip: "Banka",
            bakiye: 0
        };
        const cariRes = await DBService.addCari(newCari);

        // 3. Eğer başlangıç bakiyesi varsa, cariye bakiye hareketi ekle
        if (bakiye > 0) {
            const bakiyeHareketi = {
                cariId: cariRes.id,
                tarih: new Date().toISOString().split('T')[0],
                tur: "Bakiye Girişi",
                borcAlacak: "Borç", // Bankaya konan para bankayı borçlandırır
                tutar: bakiye,
                aciklama: "Hesap başlangıç bakiyesi"
            };
            await DBService.addCariHareket(bakiyeHareketi);
        }

        document.getElementById("bank-modal").remove();
        App.showToast("Banka hesabı başarıyla tanımlandı.");
        this.renderBankAccounts();
    },

    async deleteBanka(id) {
        if (confirm("Bu banka hesabını silmek istediğinize emin misiniz?")) {
            await DBService.deleteBanka(id);
            App.showToast("Banka hesabı silindi.");
            this.renderBankAccounts();
        }
    },

    // --- MÜRABAHA EKLEME ---
    async openMurabahaModal() {
        const cariler = await DBService.getCariler();
        const bankalar = cariler.filter(c => c.tip === "Banka"); // Sadece Banka carileri

        if (bankalar.length === 0) {
            alert("HATA: Mürabaha kredisi kullanmak için önce sol taraftan en az bir Banka Hesabı tanımlamanız gerekmektedir!");
            return;
        }

        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "mura-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Yeni Mürabaha Kredisi Kullanımı</h3>
                    <button class="modal-close" onclick="document.getElementById('mura-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="BankModule.handleMurabahaSubmit(event)">
                    <div class="form-group">
                        <label>Finansman Bankası</label>
                        <select id="mura-banka" class="form-control" required>
                            ${bankalar.map(b => `<option value="${b.id}">${b.unvan}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>İşlem Tarihi</label>
                        <input type="date" id="mura-tarih" class="form-control" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Mal Bedeli (Piyasa Fiyatı - ₺)</label>
                            <input type="number" step="0.01" id="mura-malbedeli" class="form-control" placeholder="0.00" oninput="BankModule.calculateTotalMurabaha()" required>
                        </div>
                        <div class="form-group">
                            <label>Bankanın Kâr Payı (₺)</label>
                            <input type="number" step="0.01" id="mura-karpayi" class="form-control" placeholder="0.00" oninput="BankModule.calculateTotalMurabaha()" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Toplam Banka Geri Ödeme Borcu (₺)</label>
                        <input type="number" id="mura-toplam" class="form-control" style="background:rgba(255,255,255,0.02); font-weight:700;" readonly>
                    </div>
                    <div class="form-group">
                        <label>Geri Ödeme Vade Tarihi</label>
                        <input type="date" id="mura-vade" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Açıklama / Faturalı Hammadde Bilgisi</label>
                        <input type="text" id="mura-aciklama" class="form-control" placeholder="Örn: 140 Ton demir alım finansmanı">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('mura-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">Kaydet</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    calculateTotalMurabaha() {
        const bedel = parseFloat(document.getElementById("mura-malbedeli").value) || 0;
        const kar = parseFloat(document.getElementById("mura-karpayi").value) || 0;
        document.getElementById("mura-toplam").value = (bedel + kar).toFixed(2);
    },

    async handleMurabahaSubmit(e) {
        e.preventDefault();
        const bankaCariId = document.getElementById("mura-banka").value;
        const tarih = document.getElementById("mura-tarih").value;
        const malBedeli = parseFloat(document.getElementById("mura-malbedeli").value);
        const karPayi = parseFloat(document.getElementById("mura-karpayi").value);
        const toplamBorc = malBedeli + karPayi;
        const vadeTarihi = document.getElementById("mura-vade").value;
        const aciklama = document.getElementById("mura-aciklama").value.trim();

        if (isNaN(toplamBorc) || toplamBorc <= 0) return;

        // 1. Mürabaha kaydını oluştur
        const newKredi = {
            bankaCariId: bankaCariId,
            tarih: tarih,
            malBedeli: malBedeli,
            karPayi: karPayi,
            toplamBorc: toplamBorc,
            vadeTarihi: vadeTarihi,
            durum: "Aktif",
            aciklama: aciklama
        };
        const res = await DBService.addMurabahaKredisi(newKredi);

        // 2. Banka Carisini Borçlandır (Bankaya borcumuz oluştu!)
        const bankaHareketi = {
            cariId: bankaCariId,
            tarih: tarih,
            tur: "Alım", // Finansman maliyeti girdik
            borcAlacak: "Borç", // Bizi borçlandırır, dolayısıyla caride eksiye düşeriz
            tutar: toplamBorc,
            aciklama: `Mürabaha Kredisi Kullanımı: ${aciklama || ''} (Vade: ${new Date(vadeTarihi).toLocaleDateString('tr-TR')})`,
            referansId: res.id
        };
        await DBService.addCariHareket(bankaHareketi);

        document.getElementById("mura-modal").remove();
        App.showToast("Mürabaha alım kredisi başarıyla sisteme işlendi.");
        this.renderBankAccounts();
    },

    async payMurabaha(id) {
        if (confirm("Bu mürabaha kredisinin bankaya geri ödemesini yaptığınızı ve borcu kapattığınızı onaylıyor musunuz?")) {
            const krediler = await DBService.getMurabahaKredileri();
            const kredi = krediler.find(k => k.id === id);
            if (!kredi) return;

            // 1. Krediyi Ödendi durumuna getir
            await db.collection("erp_murabaha_kredileri").doc(id).update({ durum: "Ödendi" });

            // 2. Banka carisini Alacaklandır (Borcumuz ödendi!)
            const bankaOdemeHareketi = {
                cariId: kredi.bankaCariId,
                tarih: new Date().toISOString().split('T')[0],
                tur: "Ödeme",
                borcAlacak: "Alacak", // Bankaya yaptığımız ödeme borcumuzu kapatır (alacaklandırır)
                tutar: kredi.toplamBorc,
                aciklama: `Mürabaha Geri Ödemesi Yapıldı (Borç Kapatıldı)`
            };
            await DBService.addCariHareket(bankaOdemeHareketi);

            App.showToast("Mürabaha taksit geri ödemesi yapıldı ve kapatıldı.");
            this.renderBankAccounts();
        }
    },

    async deleteMurabaha(id) {
        if (confirm("Bu mürabaha kredi kaydını ve bağlı tüm cari hareketleri silmek istediğinize emin misiniz?")) {
            await db.collection("erp_murabaha_kredileri").doc(id).delete();
            
            // Bağlı cari hareketleri temizle
            const hareketler = await DBService.getCariHareketler();
            const baglilar = hareketler.filter(h => h.referansId === id);
            for (let h of baglilar) {
                await DBService.deleteCariHareket(h.id);
            }
            
            App.showToast("Mürabaha kaydı ve ilişkili finans hareketleri silindi.");
            this.renderBankAccounts();
        }
    },

    async openMurabahaEdit(id) {
        const krediler = await DBService.getMurabahaKredileri();
        const kredi = krediler.find(k => k.id === id);
        if (!kredi) return;

        const cariler = await DBService.getCariler();
        const bankalar = cariler.filter(c => c.tip === "Banka");

        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "mura-edit-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Mürabaha Kredisini Düzenle</h3>
                    <button class="modal-close" onclick="document.getElementById('mura-edit-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="BankModule.handleMurabahaEditSubmit(event, '${id}')">
                    <div class="form-group">
                        <label>Finansman Bankası</label>
                        <select id="mura-edit-banka" class="form-control" required>
                            ${bankalar.map(b => `<option value="${b.id}" ${b.id === kredi.bankaCariId ? 'selected' : ''}>${b.unvan}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>İşlem Tarihi</label>
                        <input type="date" id="mura-edit-tarih" class="form-control" required value="${kredi.tarih}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Mal Bedeli (Piyasa Fiyatı - ₺)</label>
                            <input type="number" step="0.01" id="mura-edit-malbedeli" class="form-control" value="${kredi.malBedeli}" oninput="BankModule.calculateEditTotalMurabaha()" required>
                        </div>
                        <div class="form-group">
                            <label>Bankanın Kâr Payı (₺)</label>
                            <input type="number" step="0.01" id="mura-edit-karpayi" class="form-control" value="${kredi.karPayi}" oninput="BankModule.calculateEditTotalMurabaha()" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Toplam Banka Geri Ödeme Borcu (₺)</label>
                        <input type="number" id="mura-edit-toplam" class="form-control" value="${kredi.toplamBorc}" style="background:rgba(255,255,255,0.02); font-weight:700;" readonly>
                    </div>
                    <div class="form-group">
                        <label>Geri Ödeme Vade Tarihi</label>
                        <input type="date" id="mura-edit-vade" class="form-control" required value="${kredi.vadeTarihi}">
                    </div>
                    <div class="form-group">
                        <label>Açıklama / Faturalı Hammadde Bilgisi</label>
                        <input type="text" id="mura-edit-aciklama" class="form-control" placeholder="Örn: 140 Ton demir alım finansmanı" value="${kredi.aciklama || ''}">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('mura-edit-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">Güncelle</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    calculateEditTotalMurabaha() {
        const bedel = parseFloat(document.getElementById("mura-edit-malbedeli").value) || 0;
        const kar = parseFloat(document.getElementById("mura-edit-karpayi").value) || 0;
        document.getElementById("mura-edit-toplam").value = (bedel + kar).toFixed(2);
    },

    async handleMurabahaEditSubmit(e, id) {
        e.preventDefault();
        const bankaCariId = document.getElementById("mura-edit-banka").value;
        const tarih = document.getElementById("mura-edit-tarih").value;
        const malBedeli = parseFloat(document.getElementById("mura-edit-malbedeli").value);
        const karPayi = parseFloat(document.getElementById("mura-edit-karpayi").value);
        const toplamBorc = malBedeli + karPayi;
        const vadeTarihi = document.getElementById("mura-edit-vade").value;
        const aciklama = document.getElementById("mura-edit-aciklama").value.trim();

        if (isNaN(toplamBorc) || toplamBorc <= 0) return;

        // 1. Krediyi güncelle
        await DBService.updateMurabahaKredisi(id, {
            bankaCariId: bankaCariId,
            tarih: tarih,
            malBedeli: malBedeli,
            karPayi: karPayi,
            toplamBorc: toplamBorc,
            vadeTarihi: vadeTarihi,
            aciklama: aciklama
        });

        // 2. Bağlı eski cari hareketlerini sil
        const hareketler = await DBService.getCariHareketler();
        const baglilar = hareketler.filter(h => h.referansId === id);
        for (let h of baglilar) {
            await DBService.deleteCariHareket(h.id);
        }

        // 3. Yeni cari hareketini ekle
        const bankaHareketi = {
            cariId: bankaCariId,
            tarih: tarih,
            tur: "Alım", 
            borcAlacak: "Borç", 
            tutar: toplamBorc,
            aciklama: `Mürabaha Kredisi Güncellendi: ${aciklama || ''} (Vade: ${new Date(vadeTarihi).toLocaleDateString('tr-TR')})`,
            referansId: id
        };
        await DBService.addCariHareket(bankaHareketi);

        document.getElementById("mura-edit-modal").remove();
        App.showToast("Mürabaha kredi bilgileri güncellendi.");
        this.renderBankAccounts();
    }
};
