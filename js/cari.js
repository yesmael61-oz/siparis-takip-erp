// 📂 Firma Cari Hesap Yönetimi (cari.js)
const CariModule = {
    selectedCariId: null,

    async renderCariAccounts() {
        const container = document.getElementById("page-container");
        const cariler = await DBService.getCariler();
        const hareketler = await DBService.getCariHareketler();

        // Cari bakiyelerini hesapla
        cariler.forEach(c => {
            const cariHars = hareketler.filter(h => h.cariId === c.id);
            let bakiye = 0;
            cariHars.forEach(h => {
                if (h.borcAlacak === "Borç") {
                    bakiye += h.tutar; // Borçlandırır (Müşterinin bize borcu artar)
                } else {
                    bakiye -= h.tutar; // Alacaklandırır (Müşterinin bize borcu düşer / Ödeme yapar)
                }
            });
            c.bakiye = bakiye;
        });

        // Alfabetik sıralama (A-Z)
        cariler.sort((a, b) => a.unvan.localeCompare(b.unvan, 'tr'));

        // Seçili cariyi koru veya ilkini seç
        if (cariler.length > 0 && !this.selectedCariId) {
            this.selectedCariId = cariler[0].id;
        }

        const selectedCari = cariler.find(c => c.id === this.selectedCariId);

        container.innerHTML = `
            <div style="display:grid; grid-template-columns:300px 1fr; gap:1.5rem; height:calc(100vh - 160px);">
                <!-- Sol: Cari Listesi -->
                <div class="glass-panel" style="padding:1.25rem; display:flex; flex-direction:column; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="font-family:var(--font-heading); font-size:1.1rem;">Firma Listesi</h3>
                        <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.75rem;" onclick="CariModule.openCariModal()">
                            <i data-lucide="plus-circle" style="width:12px; height:12px;"></i> Yeni Firma
                        </button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.5rem; flex-grow:1; overflow-y:auto;" id="cari-list-items">
                        ${cariler.map(c => `
                            <div class="profile-card ${c.id === this.selectedCariId ? 'active' : ''}" 
                                 style="padding:0.75rem 1rem; border-radius:10px; cursor:pointer; flex-direction:row; justify-content:space-between; width:100%; align-items:center;"
                                 onclick="CariModule.selectCari('${c.id}')">
                                <div style="display:flex; flex-direction:column; align-items:flex-start;">
                                    <strong style="font-size:0.85rem; color:var(--text-primary); text-align:left;">${c.unvan}</strong>
                                    <span style="font-size:0.7rem; color:var(--text-secondary);">${c.tip}</span>
                                </div>
                                <div style="text-align:right; font-family:var(--font-heading); font-size:0.8rem; font-weight:700; color:${c.bakiye > 0 ? 'var(--status-green)' : c.bakiye < 0 ? 'var(--status-red)' : 'var(--text-secondary)'}">
                                    ${c.bakiye > 0 ? '+' : ''}${this.formatMoney(c.bakiye)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Sağ: Cari Detay / Ekstre -->
                <div class="glass-panel" style="padding:1.5rem; display:flex; flex-direction:column; overflow-y:auto;">
                    ${selectedCari ? `
                        <div class="statement-header">
                            <div>
                                <h2 class="statement-title" style="font-size:1.4rem;">${selectedCari.unvan}</h2>
                                <span style="font-size:0.8rem; color:var(--text-secondary);">Telefon: ${selectedCari.telefon || '-'} | Tip: ${selectedCari.tip}</span>
                            </div>
                            <div style="display:flex; gap:0.75rem;">
                                <button class="btn btn-secondary" style="padding:0.5rem 1rem; font-size:0.8rem;" onclick="CariModule.openTransactionModal('Tahsilat')">
                                    <i data-lucide="arrow-down-left" style="width:14px; height:14px; color:var(--status-green);"></i> Tahsilat Yap
                                </button>
                                <button class="btn btn-secondary" style="padding:0.5rem 1rem; font-size:0.8rem;" onclick="CariModule.openTransactionModal('Ödeme')">
                                    <i data-lucide="arrow-up-right" style="width:14px; height:14px; color:var(--status-red);"></i> Ödeme Yap
                                </button>
                                <button class="btn btn-secondary" style="padding:0.5rem 0.5rem; border-color:rgba(6,182,212,0.2); color:var(--accent-cyan);" onclick="CariModule.openCariEdit('${selectedCari.id}')" title="Cariyi Düzenle">
                                    <i data-lucide="edit-2" style="width:14px; height:14px;"></i>
                                </button>
                                <button class="btn btn-secondary" style="padding:0.5rem 0.5rem; border-color:rgba(239,68,68,0.2); color:var(--status-red);" onclick="CariModule.deleteCari('${selectedCari.id}')" title="Cariyi Sil">
                                    <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Bakiye Özet Kartları -->
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; margin-bottom:1.5rem;">
                            <div class="glass-panel" style="padding:1rem; background:rgba(255,255,255,0.01);">
                                <div style="font-size:0.75rem; color:var(--text-secondary);">TOPLAM BORÇLANDIRMA</div>
                                <div style="font-size:1.2rem; font-weight:700; color:var(--text-primary); margin-top:0.25rem;">
                                    ${this.formatMoney(hareketler.filter(h => h.cariId === selectedCari.id && h.borcAlacak === "Borç").reduce((sum, h) => sum + h.tutar, 0))}
                                </div>
                            </div>
                            <div class="glass-panel" style="padding:1rem; background:rgba(255,255,255,0.01);">
                                <div style="font-size:0.75rem; color:var(--text-secondary);">TOPLAM ALACAKLANDIRMA</div>
                                <div style="font-size:1.2rem; font-weight:700; color:var(--text-primary); margin-top:0.25rem;">
                                    ${this.formatMoney(hareketler.filter(h => h.cariId === selectedCari.id && h.borcAlacak === "Alacak").reduce((sum, h) => sum + h.tutar, 0))}
                                </div>
                            </div>
                            <div class="glass-panel" style="padding:1rem; border-color:${selectedCari.bakiye > 0 ? 'rgba(16,185,129,0.2)' : selectedCari.bakiye < 0 ? 'rgba(239,68,68,0.2)' : 'var(--border-glass)'}; background:${selectedCari.bakiye > 0 ? 'rgba(16,185,129,0.02)' : selectedCari.bakiye < 0 ? 'rgba(239,68,68,0.02)' : 'rgba(255,255,255,0.01)'}">
                                <div style="font-size:0.75rem; color:var(--text-secondary);">NET BAKİYE</div>
                                <div style="font-size:1.2rem; font-weight:800; color:${selectedCari.bakiye > 0 ? 'var(--status-green)' : selectedCari.bakiye < 0 ? 'var(--status-red)' : 'var(--text-primary)'}; margin-top:0.25rem;">
                                    ${selectedCari.bakiye > 0 ? 'Borçlu (+)' : selectedCari.bakiye < 0 ? 'Alacaklı (-)' : ''} ${this.formatMoney(Math.abs(selectedCari.bakiye))}
                                </div>
                            </div>
                        </div>

                        <!-- Ekstre Tablosu -->
                        <div style="flex-grow:1; overflow-y:auto;">
                            <table class="data-grid">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>İşlem Türü</th>
                                        <th>Açıklama</th>
                                        <th>Borç (Eklenen Tutar)</th>
                                        <th>Alacak (Ödenen/Tahsilat)</th>
                                        <th>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${hareketler.filter(h => h.cariId === selectedCari.id).sort((a,b) => new Date(a.tarih) - new Date(b.tarih)).map(h => `
                                        <tr>
                                            <td>${new Date(h.tarih).toLocaleDateString('tr-TR')}</td>
                                            <td><span class="badge ${h.tur === 'Satış' ? 'badge-active' : h.tur === 'Alım' ? 'badge-overdue' : 'badge-paid'}">${h.tur}</span></td>
                                            <td>${h.aciklama || '-'}</td>
                                            <td style="font-weight:600;">${h.borcAlacak === "Borç" ? this.formatMoney(h.tutar) : '-'}</td>
                                            <td style="font-weight:600; color:var(--status-green);">${h.borcAlacak === "Alacak" ? this.formatMoney(h.tutar) : '-'}</td>
                                            <td>
                                                <button class="logout-btn" style="padding:4px;" onclick="CariModule.deleteTransaction('${h.id}')" title="İşlemi Sil">
                                                    <i data-lucide="x" style="width:12px; height:12px; color:var(--status-red);"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                    ${hareketler.filter(h => h.cariId === selectedCari.id).length === 0 ? `
                                        <tr>
                                            <td colspan="6" style="text-align:center; color:var(--text-secondary); padding:2rem;">Bu firmaya ait henüz finansal hareket bulunmuyor.</td>
                                        </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex-grow:1; color:var(--text-secondary);">
                            <i data-lucide="users" style="width:48px; height:48px; margin-bottom:1rem; opacity:0.5;"></i>
                            <span>Lütfen detaylarını görmek için sol taraftan bir firma seçin veya yeni bir cari hesap tanımlayın.</span>
                        </div>
                    `}
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    selectCari(id) {
        this.selectedCariId = id;
        this.renderCariAccounts();
    },

    formatMoney(val) {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
    },

    // --- MODALLAR ---
    openCariModal() {
        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "cari-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Yeni Cari Hesap (Firma) Tanımla</h3>
                    <button class="modal-close" onclick="document.getElementById('cari-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="CariModule.handleCariSubmit(event)">
                    <div class="form-group">
                        <label>Firma Ünvanı / Adı</label>
                        <input type="text" id="cari-unvan" class="form-control" placeholder="Örn: Öz Yıldırım Kereste LTD" required>
                    </div>
                    <div class="form-group">
                        <label>İletişim Telefonu</label>
                        <input type="text" id="cari-tel" class="form-control" placeholder="Örn: 0532...">
                    </div>
                    <div class="form-group">
                        <label>Cari Tipi</label>
                        <select id="cari-tip" class="form-control" required>
                            <option value="Müşteri">Müşteri (Satış Yaptığımız)</option>
                            <option value="Tedarikçi">Tedarikçi / Satıcı (Alım Yaptığımız)</option>
                            <option value="Banka">Banka (Finansman / Kredi Grubu)</option>
                            <option value="Diğer">Diğer</option>
                        </select>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('cari-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">Kaydet</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    async handleCariSubmit(e) {
        e.preventDefault();
        const unvan = document.getElementById("cari-unvan").value.trim();
        const telefon = document.getElementById("cari-tel").value.trim();
        const tip = document.getElementById("cari-tip").value;

        if (!unvan) return;

        const newCari = {
            unvan: unvan,
            telefon: telefon,
            tip: tip,
            bakiye: 0
        };

        await DBService.addCari(newCari);
        document.getElementById("cari-modal").remove();
        App.showToast("Yeni cari hesap başarıyla oluşturuldu.");
        this.renderCariAccounts();
    },

    async deleteCari(id) {
        if (confirm("Bu firmayı ve ona bağlı tüm cari hareketleri silmek istediğinize emin misiniz?")) {
            await DBService.deleteCari(id);
            // Bağlı hareketleri sil
            const hareketler = await DBService.getCariHareketler();
            const baglilar = hareketler.filter(h => h.cariId === id);
            for (let h of baglilar) {
                await DBService.deleteCariHareket(h.id);
            }
            this.selectedCariId = null;
            App.showToast("Cari hesap ve tüm hareket geçmişi silindi.");
            this.renderCariAccounts();
        }
    },

    openTransactionModal(type) {
        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "trans-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>${type} Girişi</h3>
                    <button class="modal-close" onclick="document.getElementById('trans-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="CariModule.handleTransactionSubmit(event, '${type}')">
                    <div class="form-group">
                        <label>İşlem Tarihi</label>
                        <input type="date" id="trans-tarih" class="form-control" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Tutar (₺)</label>
                        <input type="number" step="0.01" id="trans-tutar" class="form-control" placeholder="0.00" required>
                    </div>
                    <div class="form-group">
                        <label>Açıklama / Makbuz No</label>
                        <input type="text" id="trans-aciklama" class="form-control" placeholder="Örn: Havale ödemesi, kasa tahsilatı vb.">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('trans-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">Kaydet</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    async handleTransactionSubmit(e, type) {
        e.preventDefault();
        const tarih = document.getElementById("trans-tarih").value;
        const tutar = parseFloat(document.getElementById("trans-tutar").value);
        const aciklama = document.getElementById("trans-aciklama").value.trim();

        if (isNaN(tutar) || tutar <= 0) return;

        const newMovement = {
            cariId: this.selectedCariId,
            tarih: tarih,
            tur: type, // "Tahsilat" veya "Ödeme"
            borcAlacak: "Alacak", // Nakit girişi/çıkışı cari hesabı alacaklandırır (borcu azaltır)
            tutar: tutar,
            aciklama: aciklama
        };

        await DBService.addCariHareket(newMovement);
        document.getElementById("trans-modal").remove();
        App.showToast(`${type} işlemi başarıyla kaydedildi.`);
        this.renderCariAccounts();
    },

    async deleteTransaction(id) {
        if (confirm("Bu cari hareketi silmek istediğinize emin misiniz?")) {
            await DBService.deleteCariHareket(id);
            App.showToast("İşlem kaydı silindi.");
            this.renderCariAccounts();
        }
    },

    async openCariEdit(id) {
        const cariler = await DBService.getCariler();
        const cari = cariler.find(c => c.id === id);
        if (!cari) return;

        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "cari-edit-modal";
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Cari Hesabı (Firma) Düzenle</h3>
                    <button class="modal-close" onclick="document.getElementById('cari-edit-modal').remove()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form onsubmit="CariModule.handleCariEditSubmit(event, '${id}')">
                    <div class="form-group">
                        <label>Firma Ünvanı / Adı</label>
                        <input type="text" id="cari-edit-unvan" class="form-control" value="${cari.unvan}" required>
                    </div>
                    <div class="form-group">
                        <label>İletişim Telefonu</label>
                        <input type="text" id="cari-edit-tel" class="form-control" value="${cari.telefon || ''}">
                    </div>
                    <div class="form-group">
                        <label>Cari Tipi</label>
                        <select id="cari-edit-tip" class="form-control" required>
                            <option value="Müşteri" ${cari.tip === 'Müşteri' ? 'selected' : ''}>Müşteri (Satış Yaptığımız)</option>
                            <option value="Tedarikçi" ${cari.tip === 'Tedarikçi' ? 'selected' : ''}>Tedarikçi / Satıcı (Alım Yaptığımız)</option>
                            <option value="Banka" ${cari.tip === 'Banka' ? 'selected' : ''}>Banka (Finansman / Kredi Grubu)</option>
                            <option value="Diğer" ${cari.tip === 'Diğer' ? 'selected' : ''}>Diğer</option>
                        </select>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('cari-edit-modal').remove()">Vazgeç</button>
                        <button type="submit" class="btn btn-primary" style="flex:1;">Güncelle</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    async handleCariEditSubmit(e, id) {
        e.preventDefault();
        const unvan = document.getElementById("cari-edit-unvan").value.trim();
        const telefon = document.getElementById("cari-edit-tel").value.trim();
        const tip = document.getElementById("cari-edit-tip").value;

        if (!unvan) return;

        await DBService.updateCari(id, {
            unvan: unvan,
            telefon: telefon,
            tip: tip
        });

        document.getElementById("cari-edit-modal").remove();
        App.showToast("Cari hesap bilgileri güncellendi.");
        this.renderCariAccounts();
    }
};
