// 👤 Çoklu Kullanıcı Profil Yönetimi
const UserManager = {
    currentUser: null,

    async init() {
        // 🚀 GÜNCELLEME KONTROLÜ (İsmail Yıldırım hariç diğer kullanıcıları oturumdan düşürme)
        const CURRENT_VERSION = "v15";
        const savedVersion = localStorage.getItem("app_version");
        if (savedVersion !== CURRENT_VERSION) {
            const savedUserId = localStorage.getItem("aktif_kullanici_id");
            if (savedUserId) {
                const cached = localStorage.getItem("cached_users_list");
                if (cached) {
                    try {
                        const users = JSON.parse(cached);
                        const user = users.find(u => u.id === savedUserId);
                        if (user && user.kullaniciAdi !== "İsmail Yıldırım") {
                            localStorage.removeItem("aktif_kullanici_id");
                        }
                    } catch (e) {
                        localStorage.removeItem("aktif_kullanici_id");
                    }
                } else {
                    localStorage.removeItem("aktif_kullanici_id");
                }
            }
            localStorage.setItem("app_version", CURRENT_VERSION);
        }

        // ⚡ Hızlı Yükleme: Önce yerel hafızadaki son başarılı kullanıcı listesini yükle (Gecikmeyi önler)
        const cached = localStorage.getItem("cached_users_list");
        if (cached) {
            try {
                this.renderProfileList(JSON.parse(cached));
            } catch (e) {
                console.warn("Önbellek okunamadı:", e);
            }
        }

        try {
            const users = await DBService.getKullanicilar();
            // Güncel listeyi yerel hafızaya yedekle
            localStorage.setItem("cached_users_list", JSON.stringify(users));
            this.renderProfileList(users);
            
            // Eğer daha önceden seçilmiş bir oturum varsa otomatik yükle
            const savedUserId = localStorage.getItem("aktif_kullanici_id");
            if (savedUserId) {
                const user = users.find(u => u.id === savedUserId);
                if (user) {
                    this.setCurrentUser(user);
                    return true;
                }
            }
        } catch (error) {
            console.error("Kullanıcı yükleme hatası:", error);
        }
        return false;
    },

    renderProfileList(users) {
        const listDiv = document.getElementById("profile-list");
        listDiv.innerHTML = "";
        
        users.forEach(user => {
            const card = document.createElement("div");
            card.className = "profile-card";
            card.onclick = () => this.selectUser(user);
            
            card.innerHTML = `
                <div class="profile-avatar">
                    <i data-lucide="${user.avatar || 'user'}"></i>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
                    <div class="profile-name" style="margin: 0; font-size: 0.95rem;">${user.kullaniciAdi}</div>
                    <div class="profile-role" style="margin: 2px 0 0 0; font-size: 0.75rem; opacity: 0.85;">${user.rol}</div>
                </div>
            `;
            listDiv.appendChild(card);
        });
        
        if (window.lucide) {
            lucide.createIcons();
        }
    },

    selectedUser: null,

    selectUser(user) {
        this.selectedUser = user;
        
        // Profil listesini gizle, şifre alanını göster
        document.getElementById("profile-list").style.display = "none";
        document.getElementById("password-form-area").style.display = "flex";
        
        // Şifre ekranı başlıklarını güncelle
        document.getElementById("selected-profile-name").innerText = user.kullaniciAdi;
        document.getElementById("selected-profile-role").innerText = user.rol;
        document.getElementById("login-password-input").value = "";
        
        const avatarIcon = document.getElementById("selected-avatar-icon");
        if (avatarIcon) {
            avatarIcon.setAttribute("data-lucide", user.avatar || "user");
        }
        
        if (window.lucide) {
            lucide.createIcons();
        }
        
        // Şifre alanına odaklan
        setTimeout(() => {
            document.getElementById("login-password-input").focus();
        }, 100);
    },

    validatePassword(e) {
        e.preventDefault();
        const enteredPassword = document.getElementById("login-password-input").value;

        if (this.selectedUser && enteredPassword === this.selectedUser.sifre) {
            // Şifre doğru
            localStorage.setItem("aktif_kullanici_id", this.selectedUser.id);
            this.setCurrentUser(this.selectedUser);
            
            // Giriş ekranını tamamen sıfırla ve gizle
            document.getElementById("password-form-area").style.display = "none";
            document.getElementById("profile-list").style.display = "flex";
            document.getElementById("login-screen").style.display = "none";
            document.getElementById("app-main").style.display = "flex";
            
            // Uygulamayı başlat
            App.onUserLoggedIn();
        } else {
            // Şifre yanlış
            alert("Hatalı Giriş Şifresi! Lütfen tekrar deneyin.");
            document.getElementById("login-password-input").value = "";
            document.getElementById("login-password-input").focus();
        }
    },

    cancelPassword() {
        this.selectedUser = null;
        document.getElementById("password-form-area").style.display = "none";
        document.getElementById("profile-list").style.display = "flex";
    },

    setCurrentUser(user) {
        this.currentUser = user;
        document.getElementById("current-user-name").innerText = user.kullaniciAdi;
        document.getElementById("current-user-role").innerText = user.rol;
    },

    logout() {
        localStorage.removeItem("aktif_kullanici_id");
        this.currentUser = null;
        document.getElementById("app-main").style.display = "none";
        document.getElementById("login-screen").style.display = "flex";
        
        // Giriş ekranı durumunu sıfırla
        document.getElementById("password-form-area").style.display = "none";
        document.getElementById("profile-list").style.display = "flex";
        
        this.init();
    },

    // 👥 İsmail Yıldırım Özel Kullanıcı Yönetim Paneli
    async renderUserManagement() {
        const container = document.getElementById("page-container");
        const users = await DBService.getKullanicilar();

        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 340px; gap:1.5rem; margin-top:0.5rem;">
                
                <!-- Kullanıcılar Tablosu -->
                <div class="glass-panel" style="padding:1.5rem;">
                    <h3 style="font-family:var(--font-heading); margin-bottom:1.25rem;">Tanımlı Kullanıcı Profilleri</h3>
                    <table class="data-grid">
                        <thead>
                            <tr>
                                <th>Avatar</th>
                                <th>Kullanıcı Adı</th>
                                <th>Sistem Rolü</th>
                                <th>Giriş Şifresi</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr>
                                    <td>
                                        <div style="width:36px; height:36px; border-radius:50%; background:var(--bg-glass-hover); display:flex; align-items:center; justify-content:center; color:var(--accent-cyan)">
                                            <i data-lucide="${u.avatar || 'user'}" style="width:16px; height:16px;"></i>
                                        </div>
                                    </td>
                                    <td style="font-weight:600;">${u.kullaniciAdi}</td>
                                    <td>${u.rol}</td>
                                    <td><code>${u.sifre}</code></td>
                                    <td>
                                        ${u.kullaniciAdi !== "İsmail Yıldırım" ? `
                                            <button class="btn btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:var(--status-red); border-color:rgba(239, 68, 68, 0.2)" onclick="UserManager.deleteUser('${u.id}')">
                                                <i data-lucide="user-x" style="width:12px; height:12px; margin-right:4px;"></i> Sil
                                            </button>
                                        ` : '<span style="font-size:0.8rem; color:var(--text-secondary)">Kilitli (Yönetici)</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Yeni Kullanıcı Tanımlama Formu -->
                <div class="glass-panel" style="padding:1.5rem; align-self:start;">
                    <h3 style="font-family:var(--font-heading); margin-bottom:1.25rem;">Yeni Kullanıcı Tanımla</h3>
                    <form id="add-user-form" onsubmit="UserManager.addUser(event)">
                        <div class="form-group">
                            <label class="form-label">Kullanıcı Adı *</label>
                            <input type="text" id="new-user-name" class="form-control" placeholder="Örn: Mehmet Can" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Giriş Şifresi *</label>
                            <input type="text" id="new-user-pass" class="form-control" placeholder="Örn: 9876" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sistem Rolü *</label>
                            <select id="new-user-role" class="form-control select-glass" style="height:37px;" required>
                                <option value="Satış Temsilcisi">Satış Temsilcisi (Sipariş Girişi)</option>
                                <option value="Finans Müdürü">Finans Müdürü (Tam Yetki)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Profil Avatarı *</label>
                            <select id="new-user-avatar" class="form-control select-glass" style="height:37px;" required>
                                <option value="user">Standart Kullanıcı</option>
                                <option value="user-check">Onaylı Temsilci</option>
                                <option value="users">Grup/Ekip</option>
                                <option value="shield">Güvenlik / Yönetici</option>
                                <option value="landmark">Finansal Simge</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block" style="background:linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); margin-top:1.5rem;">
                            <i data-lucide="user-plus"></i> Kullanıcı Oluştur
                        </button>
                    </form>
                </div>

            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    // Yeni Kullanıcı Ekle
    async addUser(e) {
        e.preventDefault();
        const ad = document.getElementById("new-user-name").value.trim();
        const sifre = document.getElementById("new-user-pass").value.trim();
        const rol = document.getElementById("new-user-role").value;
        const avatar = document.getElementById("new-user-avatar").value;

        if (!ad || !sifre) return;

        // Benzersiz isim kontrolü
        const users = await DBService.getKullanicilar();
        if (users.some(u => u.kullaniciAdi.toLowerCase() === ad.toLowerCase())) {
            alert(`HATA: "${ad}" adında bir kullanıcı zaten mevcut!`);
            return;
        }

        const newUser = {
            kullaniciAdi: ad,
            sifre: sifre,
            rol: rol,
            avatar: avatar
        };

        await db.collection("erp_kullanicilar").add(newUser);
        App.showToast("Yeni kullanıcı profil tanımlaması yapıldı!");
        
        document.getElementById("add-user-form").reset();
        this.renderUserManagement();
    },

    // Kullanıcı Sil
    async deleteUser(id) {
        const users = await DBService.getKullanicilar();
        const target = users.find(u => u.id === id);
        if (!target) return;

        if (target.kullaniciAdi === "İsmail Yıldırım") {
            alert("HATA: Ana yönetici hesabını silemezsiniz!");
            return;
        }

        if (confirm(`"${target.kullaniciAdi}" isimli kullanıcıyı silmek istediğinize emin misiniz?`)) {
            await db.collection("erp_kullanicilar").doc(id).delete();
            App.showToast("Kullanıcı profil kaydı başarıyla silindi.");
            this.renderUserManagement();
        }
    }
};
