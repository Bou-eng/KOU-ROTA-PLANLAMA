"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "tr" | "en";

const translations: Record<string, string> = {
  "Dashboard": "Dashboard",
  "İstasyonlar": "Stations",
  "Talepler": "Requests",
  "Planlama": "Planning",
  "Sonuçlar": "Results",
  "Geçmiş": "History",
  "Talep Oluştur": "Create Request",
  "Taleplerim": "My Requests",
  "Rotam": "My Route",
  "Çıkış Yap": "Log out",
  "Dil": "Language",
  "Türkçe": "Turkish",
  "İngilizce": "English",
  "Yükleniyor...": "Loading...",
  "İstasyon bulunamadı": "No stations found",
  "Henüz istasyon eklenmemiş": "No stations have been added yet",
  "Bekleyen Talepler": "Pending Requests",
  "Planlanan Talepler": "Planned Requests",
  "Yarınki Toplam Yük": "Tomorrow's Total Load",
  "Yarınki Toplam Adet": "Tomorrow's Total Items",
  "Kargo taleplerinizi buradan yönetebilirsiniz.": "Manage your cargo requests from here.",
  "Hızlı Talep Oluştur": "Create Quick Request",
  "İstasyon": "Station",
  "Talep oluşturuldu.": "Request created.",
  "Lütfen istasyon seçin.": "Please select a station.",
  "Admin Dashboard": "Admin Dashboard",
  "Sistem özeti ve hızlı erişim menüsü": "System overview and quick access menu",
  "Planla": "Plan",
  "Planlama Yapılıyor...": "Planning...",
  "Hızlı Erişim": "Quick Access",
  "İstasyon Yönetimi": "Station Management",
  "İstasyonları görüntüle ve yönet": "View and manage stations",
  "Kullanıcı taleplerini incele": "Review user requests",
  "Rota Planlama": "Route Planning",
  "Yeni planlama başlat": "Start a new plan",
  "Geçmiş Planlamalar": "Planning History",
  "Önceki sonuçları görüntüle": "View previous results",
  "İstasyonları ekleyin, düzenleyin veya yönetin": "Add, edit, or manage stations",
  "Yeni İstasyon Ekle": "Add New Station",
  "İstasyon Adı": "Station Name",
  "İstasyon Listesi": "Station List",
  "İşlem": "Actions",
  "Düzenle": "Edit",
  "Sil": "Delete",
  "Merkez istasyon": "Central station",
  "Kargo Talebi Oluştur": "Create Cargo Request",
  "Yeni bir kargo talebi oluşturun. Talep oluşturulduktan sonra": "Create a new cargo request. After it is created,",
  "planlama yapıldığında rotaya dahil edilecektir.": "it will be included in a route when planning runs.",
  "İstasyon Seçimi": "Station Selection",
  "Bir istasyon seçin...": "Select a station...",
  "Kargonun teslim edileceği istasyonu seçin.": "Select the station where the cargo will be delivered.",
  "Oluşturduğunuz tüm kargo taleplerinizi görüntüleyin.": "View all cargo requests you have created.",
  "Yeni Talep": "New Request",
  "Tarih Aralığı": "Date Range",
  "Tümü": "All",
  "Bugün": "Today",
  "Yarın": "Tomorrow",
  "Planlandı": "Planned",
  "Beklemede": "Pending",
  "İptal": "Cancelled",
  "Bu tarih için planlanmış rotanız yok.": "You have no planned route for this date.",
  "Bu Tarih İçin Rotanız Yok": "No Route For This Date",
  "Giriş Yap": "Sign In",
  "Kayıt Ol": "Register",
  "Kargo taleplerinizi görüntülemek ve yönetmek için hesabınıza giriş yapın.": "Sign in to view and manage your cargo requests.",
  "Kullanıcı Adı veya E-posta": "Username or Email",
  "Şifre": "Password",
  "Şifreyi gizle": "Hide password",
  "Şifreyi göster": "Show password",
  "Hesap oluşturun ve kargo taleplerinizi yönetmeye başlayın.": "Create an account and start managing your cargo requests.",
  "Şifreler eşleşmiyor": "Passwords do not match",
  "Başarılı! Kayıt oldunuz. Giriş sayfasına geçebilirsiniz.": "Success! Your account was created. You can continue to the sign-in page.",
  "Tüm hakları saklıdır.": "All rights reserved.",
  "Planlama başarılı oldu. Sonuçlar aşağıda gösterilmektedir.": "Planning completed successfully. The results are shown below.",
  "Seçilen tarihte planlanacak talep yok.": "There are no requests to plan for the selected date.",
  "Önemli Bilgi": "Important Information",
  "Seçilen tarihin talepleri toplanır": "Requests for the selected date are collected",
  "Sezgisel algoritma çalıştırılır": "The heuristic algorithm is run",
  "Rota atanır ve sonuç kaydedilir": "Routes are assigned and the result is saved",
  "Araç Sayısı": "Vehicle Count",
  "Toplam Yük": "Total Load",
  "Araçlar": "Vehicles",
  "Araç bulunamadı.": "No vehicles found.",
  "Yük": "Load",
  "Son Çalıştırma": "Last Run",
  "Planlama Kayıtları": "Planning Records",
  "Planlama kaydı silindi.": "Planning record deleted.",
  "Tüm kayıtlar silindi.": "All records deleted.",
  "Silme işlemi başarısız.": "Delete operation failed.",
  "İstasyonlar yüklenemedi.": "Stations could not be loaded.",
  "Oturum bulunamadı. Lütfen tekrar giriş yapın.": "Session not found. Please sign in again.",
  "İstasyon eklendi.": "Station added.",
  "Herhangi bir yere bağlı olarak km eklenemez.": "A distance cannot be added without connecting two stations.",
  "Mesafe kaydedildi.": "Distance saved.",
  "Mesafeler kaydedildi.": "Distances saved.",
  "İstasyon adı boş olamaz.": "Station name cannot be empty.",
  "Geçersiz enlem (-90..90).": "Invalid latitude (-90..90).",
  "Geçersiz boylam (-180..180).": "Invalid longitude (-180..180).",
  "İstasyon güncellendi.": "Station updated.",
  "Güncelleme başarısız.": "Update failed.",
  "İstasyon silindi.": "Station deleted.",
  "Silme başarısız.": "Delete failed.",
  "Lütfen bir istasyon seçin.": "Please select a station.",
  "Merkez istasyon güncellendi.": "Central station updated.",
  "Merkez istasyon ayarlanamadı.": "Central station could not be set.",
  "-- Seç --": "-- Select --",
  "-- İstasyon seçin --": "-- Select a station --",
  "Örn: Merkez İstasyon": "E.g. Central Station",
  "Örn: İzmit İstasyonu": "E.g. Izmit Station",
  "Özet": "Summary",
  "Durak Sayısı": "Stop Count",
  "Kargo Adedi": "Cargo Quantity",
  "Toplam Ağırlık (kg)": "Total Weight (kg)",
  "Tarih": "Date",
  "Durum": "Status",
  "Aksiyon": "Action",
  "Tümünü Gör →": "View All →",
  "İstasyon seçin...": "Select a station...",
  "Özel talep veya notlarınızı buraya yazabilirsiniz...": "You can enter special requests or notes here...",
  "Lütfen tüm alanları doğru şekilde doldurunuz.": "Please fill in all fields correctly.",
  "Seçtiğiniz rol ile hesabınızın rolü eşleşmiyor.": "The selected role does not match your account role.",
  "Giriş başarısız. Lütfen tekrar deneyiniz.": "Sign-in failed. Please try again.",
  "E-posta veya şifre hatalı.": "The email or password is incorrect.",
  "Lütfen e-postanız ve şifrenizi kontrol ediniz.": "Please check your email and password.",
  "E-posta boş olamaz.": "Email cannot be empty.",
  "Şifre en az 6 karakter olmalıdır.": "Password must be at least 6 characters.",
  "Kullanıcı adı veya e-posta kullanımda.": "The username or email is already in use.",
  "Kayıt başarısız. Lütfen tekrar deneyiniz.": "Registration failed. Please try again.",
  "Sunucuya bağlanılamadı": "Could not connect to the server",
  "Planlama hatası": "Planning error",
  "Planlama sırasında bir hata oluştu.": "An error occurred during planning.",
  "Planlama sonucu alınamadı.": "Planning result could not be loaded.",
  "Planlama kayıtları yüklenemedi.": "Planning records could not be loaded.",
  "Rota yüklenemedi.": "Route could not be loaded.",
  "Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.": "User information not found. Please sign in again.",
  "Talepler yüklenemedi.": "Requests could not be loaded.",
  "Talep oluşturulurken hata oluştu.": "An error occurred while creating the request.",
  "Henüz istasyon bulunmamaktadır.": "There are no stations yet.",
  "Yarınki İstasyon Sayısı": "Tomorrow's Station Count",
  "Yarınki Toplam Talep": "Tomorrow's Total Requests",
  "Toplam Planlama Koşusu": "Total Planning Runs",
  "Son Çalıştırma Maliyeti": "Last Run Cost",
  "Planlama parametrelerini ayarlayın ve başlatın": "Configure the planning parameters and start",
  "Sınırsız Araç (Minimum Maliyet)": "Unlimited Vehicles (Minimum Cost)",
  "Maliyet minimize edilir. Gerektiğinde kiralanabilir": "Cost is minimized. Rental vehicles can be used",
  "araçlar kullanılabilir.": "when necessary.",
  "Belirli Araç Sayısı (3 Araç)": "Fixed Vehicle Count (3 Vehicles)",
  "Sadece mevcut 3 araç kullanılır. Araç kapasiteleri dikkate": "Only the existing 3 vehicles are used. Vehicle capacities are",
  "alınır.": "taken into account.",
  "Km Başına Maliyet (₺)": "Cost per Kilometer (₺)",
  "Araç 1 Kapasitesi (kg)": "Vehicle 1 Capacity (kg)",
  "Araç 2 Kapasitesi (kg)": "Vehicle 2 Capacity (kg)",
  "Araç 3 Kapasitesi (kg)": "Vehicle 3 Capacity (kg)",
  "Kiralık Araç Kapasitesi (kg)": "Rental Vehicle Capacity (kg)",
  "Kiralık Araç Maliyeti (₺)": "Rental Vehicle Cost (₺)",
  "Brute-force yöntemi yasaktır. Planlama için sezgisel": "Brute-force is forbidden. A heuristic algorithm",
  "algoritma (Greedy, En Yakın Komşu vb.) kullanılacaktır.": "(Greedy, Nearest Neighbor, etc.) will be used for planning.",
  "Planlama Akışı": "Planning Flow",
  "Planlanıyor...": "Planning...",
  "Planlamayı Başlat": "Start Planning",
  "Sonuçlar \"Sonuçlar\" sekmesinde görüntülenebilir": "Results can be viewed in the \"Results\" tab",
  "(Kiralık)": "(Rental)",
  "Kapasite": "Capacity",
  "Hizmet Verilememiş İstasyonlar": "Unserved Stations",
  "Durak Sırası": "Stop Order",
  "Planlama Sonuçları": "Planning Results",
  "Seçilen planlama sonucu": "Selected planning result",
  "Planlama sonucu yükleniyor...": "Loading planning result...",
  "Henüz planlama sonucu yok.": "There is no planning result yet.",
  "Harita Görünümü": "Map View",
  "Seçilen planlama bulunamadı.": "Selected planning run not found.",
  "Daha önce çalıştırılan tüm planlama kayıtları": "All previously executed planning records",
  "Belirli Araç (3)": "Fixed Vehicles (3)",
  "Sınırsız Araç": "Unlimited Vehicles",
  "Oluşturulma": "Created",
  "Kayıtlar yükleniyor...": "Loading records...",
  "Henüz planlama kaydı yok.": "There are no planning records yet.",
  "Görüntüle": "View",
  "kayıt": "record",
  "Planlama kaydını silmek istediğinize emin misiniz?": "Are you sure you want to delete this planning record?",
  "Tüm planlama kayıtlarını silmek istediğinize emin misiniz?": "Are you sure you want to delete all planning records?",
  "Bu kayıt silinecek. Bu işlem geri alınamaz.": "This record will be deleted. This action cannot be undone.",
  "Tüm geçmiş planlamalar silinecek. Bu işlem geri alınamaz.": "All planning history will be deleted. This action cannot be undone.",
  "İstasyon eklenirken bir hata oluştu.": "An error occurred while adding the station.",
  "Mesafe kaydedilirken hata oluştu.": "An error occurred while saving the distance.",
  "Bu bağlantı zaten mevcut": "This connection already exists",
  "Bu iki istasyon zaten bağlı. Değeri değiştirmek için 'Km Düzenle' kullanın.": "These two stations are already connected. Use 'Edit Distance' to change the value.",
  "İstasyon seçilmelidir.": "A station must be selected.",
  "Mesafe geçersiz.": "Invalid distance.",
  "Her iki istasyon seçilmelidir.": "Both stations must be selected.",
  "Farklı istasyonlar seçmelisiniz.": "You must select different stations.",
  "Mesafe 1 geçersiz.": "Distance 1 is invalid.",
  "Mesafe 2 geçersiz.": "Distance 2 is invalid.",
  "Geçersiz enlem": "Invalid latitude",
  "Geçersiz boylam": "Invalid longitude",
  "İstasyonu Düzenle": "Edit Station",
  "Km Düzenle": "Edit Distance",
  "Km Ekle/Düzenle": "Add/Edit Distance",
  "Mesafe Tanımla (1 bağlantı)": "Define Distance (1 connection)",
  "Merkez istasyon düzenle": "Edit central station",
  "Kayıtlı bağlantı yok.": "No saved connections.",
  "çift yön": "bidirectional",
  "Yakın İstasyon": "Nearby Station",
  "Uzaklık": "Distance",
  "Uzaklık 2": "Distance 2",
  "İstasyonu Sil": "Delete Station",
  "Bu istasyonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.": "Are you sure you want to delete this station? This action cannot be undone.",
  "Merkez İstasyon Seç": "Select Central Station",
  "Planlama için kullanılacak merkez istasyonu seçin.": "Select the central station to use for planning.",
  "Gönderilecek toplam kargo sayısını girin.": "Enter the total number of cargo items to send.",
  "Toplam ağırlığı kilogram cinsinden girin.": "Enter the total weight in kilograms.",
  "Harita yükleniyor...": "Loading map...",
  "Planlanan rota ve duraklar aşağıda listelenmektedir.": "The planned route and stops are listed below.",
  "Planlama yapıldığında ve talepleriniz bir rotaya dahil edildiğinde": "This will appear when planning is run and your requests are included in a route.",
  "Durak": "Stop",
  "Duraklar": "Stops",
  "Rota Özeti": "Route Summary",
  "Rota Detayları": "Route Details",
  "Talep Detayları": "Request Details",
  "Oluşturma": "Created",
  "Rota atanmadı": "No route assigned",
  "Oluşturuluyor...": "Creating...",
  "Rotayı Gör": "View Route",
  "Tüm kargoların toplam ağırlığını kilogram cinsinden girin.": "Enter the total weight of all cargo in kilograms.",
  "Kargonun ulaşması gereken tarihi seçin.": "Select the date by which the cargo must arrive.",
  "Oluşturduğunuz talep \"Beklemede\" durumunda olacaktır.": "Your request will have a \"Pending\" status.",
  "Sistem yöneticisi planlama yaptığında talebiniz otomatik olarak": "When the system administrator runs planning, your request will automatically",
  "bir rotaya atanacak ve \"Planlandı\" durumuna": "be assigned to a route and change to \"Planned\" status",
  "geçecektir.": ".",
  "Henüz talebiniz bulunmuyor.": "You do not have any requests yet.",
  "Ağırlık (kg)": "Weight (kg)",
  "talep gösteriliyor": "requests shown",
  "Toplam Ağırlık": "Total Weight",
  "Talebiniz planlama sonrası rotaya dahil edilir.": "Your request will be included in a route after planning.",
  "Hesabın yok mu? ": "Don't have an account? ",
  "Zaten hesabın var mı? ": "Already have an account? ",
  "Rol": "Role",
  "Kullanıcı": "User",
  "Yönetici": "Administrator",
  "Gönder": "Submit",
  "Kaydet": "Save",
};

const reverseTranslations = Object.fromEntries(
  Object.entries(translations).map(([turkish, english]) => [english, turkish])
);

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function translateText(text: string, language: Language) {
  const dictionary = language === "en" ? translations : reverseTranslations;
  return Object.entries(dictionary)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((result, [source, target]) => result.replaceAll(source, target), text);
}

function translateDom(root: Node, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) nodes.push(current as Text);

  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "INPUT", "TEXTAREA"].includes(parent.tagName)) return;
    const translated = translateText(node.nodeValue || "", language);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  });

  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll("*"))] : [];
  elements.forEach((element) => {
    ["placeholder", "aria-label", "title"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, translateText(value, language));
    });
  });
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "tr";
    const saved = window.localStorage.getItem("kou_language");
    return saved === "en" || saved === "tr" ? saved : "tr";
  });

  useEffect(() => {
    window.localStorage.setItem("kou_language", language);
    document.documentElement.lang = language;
    translateDom(document.body, language);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => translateDom(node, language));
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage: (nextLanguage: Language) => setLanguageState(nextLanguage),
      toggleLanguage: () => setLanguageState((current) => (current === "tr" ? "en" : "tr")),
      t: (text: string) => (language === "en" ? translateText(text, language) : text),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10"
      aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
      title={language === "tr" ? "English" : "Türkçe"}
    >
      {language === "tr" ? "EN" : "TR"}
    </button>
  );
}
