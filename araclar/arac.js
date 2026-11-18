// Ücretsiz araçlar: proje kârlılığı, saat maliyeti, ERP hazırlık testi.
// Görünen metinlerin hepsi sayfada (#metin) durur; çeviri betiği onları dile çevirir.
(function () {
  var dil = document.documentElement.lang || 'tr';
  var TR = dil.slice(0, 2) === 'tr';
  var SABLON_DIL = { 'sr-Latn-ME': 'me' }[dil] || dil.slice(0, 2);
  if (['tr', 'en', 'az', 'ar', 'bs', 'me', 'sq', 'mk'].indexOf(SABLON_DIL) < 0) SABLON_DIL = 'en';
  var para = new Intl.NumberFormat(dil, { style: 'currency', currency: TR ? 'TRY' : 'EUR', maximumFractionDigits: 0 });
  var sayi = new Intl.NumberFormat(dil, { maximumFractionDigits: 0 });
  var yuzde = new Intl.NumberFormat(dil, { style: 'percent', maximumFractionDigits: 1 });
  function $(id) { return document.getElementById(id); }
  function T(k, v) {
    var e = document.querySelector('#metin [data-k="' + k + '"], #formMetin [data-k="' + k + '"]');
    var s = e ? e.textContent : k;
    for (var a in v || {}) s = s.split('{' + a + '}').join(v[a]);
    return s;
  }
  function deger(id) { var x = parseFloat(($(id).value || '').replace(',', '.')); return isFinite(x) ? x : 0; }
  function yaz(id, s, sinif) { var e = $(id); if (!e) return; e.textContent = s; if (sinif !== undefined) e.className = 'deger ' + sinif; }
  function olay(ad) { try { if (window.umami) umami.track(ad); } catch (e) {} }
  var kullanildi = false;
  function ilkKullanim(ad) { if (!kullanildi) { kullanildi = true; olay(ad); } }
  // Varsayılan örnek değerler: Türkçede TL, diğer dillerde avro
  function doldur(ornek) {
    var q = new URLSearchParams(location.search);
    for (var id in ornek) if ($(id) && !$(id).value) $(id).value = ornek[id][TR ? 0 : 1];
    q.forEach(function (v, k) { if ($(k) && isFinite(parseFloat(v))) $(k).value = v; });
  }
  function kayitli() { try { return JSON.parse(localStorage.getItem('voh-lead') || 'null'); } catch (e) { return null; } }

  // ---------------------------------------------------------------- bilgi formu (şablon indirme + sonucu değerlendirme)
  var pen = $('aracPencere'), fm = $('aracForm');
  var ALANLAR = ['ad', 'firma', 'eposta', 'telefon', 'sektor', 'calisan'];
  function durum(metin, sinif, link) {
    var d = $('penDurum'); d.className = 'form-durum ' + (sinif || ''); d.textContent = metin;
    if (link) { var a = document.createElement('a'); a.href = link; a.setAttribute('download', ''); a.textContent = T('fIndLink'); d.appendChild(document.createTextNode(' ')); d.appendChild(a); }
  }
  function pencereAc(tur, dosya) {
    if (!pen) return;
    var d = tur === 'degerlendirme';
    fm.elements.tur.value = tur; fm.elements.sablon.value = dosya || '';
    pen.classList.toggle('degerlendir', d);
    $('penBaslik').textContent = T(d ? 'fDegBaslik' : 'fIndBaslik');
    $('penMetin').textContent = T(d ? 'fDegMetin' : 'fIndMetin');
    $('penDugme').textContent = T(d ? 'fDegDugme' : 'fIndDugme');
    $('penDugme').disabled = false;
    var k = kayitli() || {};
    ALANLAR.forEach(function (n) { if (!fm.elements[n].value && k[n]) fm.elements[n].value = k[n]; });
    durum('');
    if (pen.showModal) pen.showModal(); else pen.setAttribute('open', '');
    olay(d ? 'form-degerlendirme-ac' : 'form-sablon-ac');
  }
  function ozet() {
    var s = [], m = function (e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
    document.querySelectorAll('.tgrid form .alan').forEach(function (a) {
      var i = a.querySelector('input'); if (i) s.push(m(a.querySelector('label')) + ': ' + i.value + ' ' + m(a.querySelector('.girdi span')));
    });
    document.querySelectorAll('.sonuc .kutu').forEach(function (k) { s.push(m(k.querySelector('.ad')) + ': ' + m(k.querySelector('.deger')) + ' ' + m(k.querySelector('.alt'))); });
    document.querySelectorAll('.sonuc .cubuklar div').forEach(function (k) { s.push(m(k.querySelector('span')) + ': ' + m(k.querySelector('em'))); });
    document.querySelectorAll('.sonuc .satir').forEach(function (k) { s.push(m(k.querySelector('span')) + ': ' + m(k.querySelector('b'))); });
    if (document.querySelector('.sonuc .yorum')) s.push(m(document.querySelector('.sonuc .yorum')));
    document.querySelectorAll('#erp .soru').forEach(function (q) {
      var c = q.querySelector('input:checked'); s.push(m(q.querySelector('p')) + ' → ' + (c ? m(c.nextElementSibling) : '–'));
    });
    if ($('erpSonuc') && !$('erpSonuc').hidden) s.push(m($('puan')) + ' · ' + m($('bantBaslik')));
    return s.join('\n');
  }
  if (pen) {
    $('penKapat').addEventListener('click', function () { pen.close ? pen.close() : pen.removeAttribute('open'); });
    pen.addEventListener('click', function (e) { if (e.target === pen && pen.close) pen.close(); });
    document.querySelectorAll('[data-degerlendir]').forEach(function (b) {
      b.addEventListener('click', function () { pencereAc('degerlendirme'); });
    });
    fm.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = fm.elements;
      if (el.website.value) return;
      if (!el.ad.value.trim() || !el.firma.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.eposta.value.trim()) || !el.izin.checked) {
        durum(T('fEksik'), 'err'); return;
      }
      var g = fm.querySelector('[name="g-recaptcha-response"]');
      if (g && !g.value) { durum(T('fRobot'), 'err'); return; }
      var tur = el.tur.value;
      el.sonuc.value = tur === 'degerlendirme' ? ozet() : '';
      el.dil.value = dil; el.sayfa.value = location.pathname;
      // Türkçe karşılığının adresi: CRM'de hangi araç olduğu dilden bağımsız görünsün
      var trl = document.querySelector('link[hreflang="tr"]');
      el.arac.value = trl ? trl.getAttribute('href').replace(/^https?:\/\/[^/]+/, '') : '';
      var btn = $('penDugme'), eski = btn.textContent;
      btn.disabled = true; btn.textContent = T('fGonder');
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                   body: new URLSearchParams(new FormData(fm)).toString() })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          var k = {}; ALANLAR.forEach(function (n) { k[n] = el[n].value; });
          try { localStorage.setItem('voh-lead', JSON.stringify(k)); } catch (x) {}
          btn.textContent = eski;
          if (tur === 'indirme') {
            olay('lead-sablon'); olay('sablon-indir');
            var a = document.createElement('a'); a.href = el.sablon.value; a.setAttribute('download', '');
            document.body.appendChild(a); a.click(); a.remove();
            durum(T('fIndOk'), 'ok', el.sablon.value);
          } else {
            olay('lead-degerlendirme');
            durum(T('fDegOk'), 'ok');
          }
        })
        .catch(function () { btn.disabled = false; btn.textContent = eski; durum(T('fHata'), 'err'); })
        .then(function () { try { if (window.grecaptcha) grecaptcha.reset(); } catch (x) {} });
    });
  }

  var simge = TR ? '₺' : '€';
  document.querySelectorAll('.girdi span').forEach(function (e) { e.textContent = e.textContent.replace('¤', simge); });
  document.querySelectorAll('[data-en-href]').forEach(function (a) {
    // şablonun sayfa diliyle aynı dildeki sürümü (…-tr.xlsx → …-<dil>.xlsx)
    if (!TR) a.setAttribute('href', a.getAttribute('href').replace(/-tr\.xlsx$/, '-' + SABLON_DIL + '.xlsx'));
    a.addEventListener('click', function (e) {
      // bilgi bir kez bırakıldıysa doğrudan iner, yoksa önce form
      if (kayitli() || !$('aracPencere')) { olay('sablon-indir'); return; }
      e.preventDefault();
      pencereAc('indirme', a.getAttribute('href'));
    });
  });

  // ---------------------------------------------------------------- proje kârlılığı
  if ($('pk')) {
    doldur({ tutar: [950000, 95000], malzeme: [380000, 38000], taseron: [120000, 12000], diger: [25000, 2500],
             saat: [700, 700], saatMaliyet: [320, 32], genel: [12, 12] });
    var RENK = ['#6366F1', '#22D3EE', '#94A3B8', '#F59E0B', '#A78BFA'];
    var pk = function () {
      var T0 = deger('tutar'), M = deger('malzeme'), S = deger('taseron'), D = deger('diger');
      var H = deger('saat'), C = deger('saatMaliyet'), G = deger('genel') / 100;
      var iscilik = H * C, genel = T0 * G;
      var gorunen = T0 - M - S - D, gercek = gorunen - iscilik - genel;
      var gm = T0 ? gorunen / T0 : 0, rm = T0 ? gercek / T0 : 0;
      yaz('gorunen', para.format(gorunen));
      yaz('gorunenMarj', T('marj', { m: yuzde.format(gm) }));
      yaz('gercek', para.format(gercek), gercek < 0 ? 'kotu' : rm < 0.1 ? 'orta' : 'iyi');
      yaz('gercekMarj', T('marj', { m: yuzde.format(rm) }));
      var parcalar = [M, S, D, iscilik, genel], top = Math.max(T0, parcalar.reduce(function (a, b) { return a + b; }, 0));
      var serit = $('serit'); serit.innerHTML = '';
      parcalar.concat([Math.max(gercek, 0)]).forEach(function (p, i) {
        var e = document.createElement('i'); e.style.width = (top ? p / top * 100 : 0) + '%';
        e.style.background = i < 5 ? RENK[i] : '#34D399'; serit.appendChild(e);
      });
      var basabas = C ? (T0 - M - S - D - genel) / C : 0;
      yaz('basabas', basabas > 0 ? T('saatDeger', { s: sayi.format(basabas) }) : T('yok'));
      yaz('saatKazanc', H ? para.format((T0 - M - S - D - genel) / H) : '–');
      yaz('sapma', para.format(gercek - iscilik * 0.2));
      var fark = gorunen - gercek;
      $('pkYorum').textContent = gercek < 0 ? T('yZarar', { f: para.format(fark) })
        : rm < 0.1 ? T('yInce', { f: para.format(fark), m: yuzde.format(rm) })
        : T('yIyi', { f: para.format(fark), m: yuzde.format(rm) });
    };
    $('pk').addEventListener('input', function () { ilkKullanim('arac-proje-karliligi'); pk(); });
    pk();
  }

  // ---------------------------------------------------------------- saat maliyeti
  if ($('sm')) {
    doldur({ maliyet: [62000, 3800], yan: [6000, 300], maasSayisi: [12, 12], haftaSaat: [45, 40], haftaGun: [5, 5],
             izin: [29, 30], verim: [75, 75] });
    var sm = function () {
      var A = deger('maliyet'), Y = deger('yan'), N = deger('maasSayisi') || 12, W = deger('haftaSaat');
      var g = deger('haftaGun') || 5, L = deger('izin'), P = deger('verim') / 100;
      var yillik = A * N + Y * 12;
      var mesai = Math.max(W * 52 - L * (W / g), 0), verimli = mesai * P;
      var kolay = W ? A / (W * 52 / 12) : 0;
      var c1 = mesai ? yillik / mesai : 0, c2 = verimli ? yillik / verimli : 0;
      yaz('yillik', para.format(yillik));
      yaz('mesaiSaat', T('saatDeger', { s: sayi.format(mesai) }));
      yaz('verimliSaat', T('saatDeger', { s: sayi.format(verimli) }));
      yaz('c1', para.format(c1));
      yaz('c2', para.format(c2));
      yaz('kolay', para.format(kolay));
      $('smYorum').textContent = T('yFark', { k: para.format(kolay), g: para.format(c2), f: yuzde.format(kolay ? c2 / kolay - 1 : 0) });
      var a = $('aktar'); a.setAttribute('href', a.getAttribute('href').split('?')[0] + '?saatMaliyet=' + Math.round(c2));
    };
    $('sm').addEventListener('input', function () { ilkKullanim('arac-saat-maliyeti'); sm(); });
    sm();
  }

  // ---------------------------------------------------------------- ERP hazırlık testi
  if ($('erp')) {
    var sorular = document.querySelectorAll('#erp .soru');
    var et = function () {
      var puan = 0, cevap = 0, sorun = [];
      sorular.forEach(function (s) {
        var c = s.querySelector('input:checked'); if (!c) return;
        cevap++; puan += +c.value;
        if (+c.value === 2) sorun.push(s);
      });
      $('ilerleme').textContent = T('ilerleme', { c: cevap, t: sorular.length });
      if (cevap < sorular.length) { $('erpSonuc').hidden = true; return; }
      ilkKullanim('arac-erp-testi');
      var ilk = $('erpSonuc').hidden;
      $('erpSonuc').hidden = false;
      $('puan').firstChild.nodeValue = puan;
      $('olcekIsaret').style.left = (puan / 24 * 100) + '%';
      var bant = puan <= 6 ? 'b1' : puan <= 14 ? 'b2' : 'b3';
      $('bantBaslik').textContent = T(bant + 'Baslik');
      $('bantBaslik').className = puan <= 6 ? 'iyi' : puan <= 14 ? 'orta' : 'kotu';
      $('bantMetin').textContent = T(bant + 'Metin');
      var liste = $('alanlar'); liste.innerHTML = '';
      sorun.slice(0, 5).forEach(function (s) {
        var li = document.createElement('li'), b = document.createElement('b');
        b.textContent = s.querySelector('.alan-ad').textContent; li.appendChild(b);
        li.appendChild(document.createTextNode(s.querySelector('.oneri').textContent));
        liste.appendChild(li);
      });
      $('alanBaslik').hidden = !sorun.length;
      if (ilk && cevap) $('erpSonuc').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    $('erp').addEventListener('change', et);
    et();
  }

  // ---------------------------------------------------------------- teklif fiyatı ve marj
  if ($('tf')) {
    doldur({ maliyet: [10000, 1000], hedefMarj: [25, 25], iskonto: [10, 10] });
    var tf = function () {
      var C = deger('maliyet'), m = deger('hedefMarj') / 100, d = deger('iskonto') / 100;
      if (m >= 1) m = 0.99;
      var P = C / (1 - m), E = C * (1 + m), Pd = P * (1 - d);
      var em = E ? 1 - C / E : 0, dm = Pd ? 1 - C / Pd : 0;
      var k1 = P - C, k2 = Pd - C;
      yaz('dogruFiyat', para.format(P));
      yaz('dogruMarj', T('marj', { m: yuzde.format(m) }));
      yaz('iskFiyat', para.format(Pd), k2 < 0 ? 'kotu' : dm < m / 2 ? 'orta' : '');
      yaz('iskMarj', T('marj', { m: yuzde.format(dm) }));
      yaz('ekleFiyat', para.format(E));
      yaz('ekleMarj', yuzde.format(em));
      yaz('gerekEkle', yuzde.format(m / (1 - m)));
      yaz('birimKar', para.format(k1) + ' / ' + para.format(k2));
      var telafi = k2 > 0 ? k1 / k2 - 1 : null;
      yaz('telafi', telafi === null ? T('yok') : yuzde.format(telafi));
      var y = T('yEkle', { h: yuzde.format(m), e: para.format(E), g: yuzde.format(em), f: para.format(P), k: para.format(P - E) });
      if (d > 0) y += k2 <= 0 ? T('yIskZarar', { i: yuzde.format(d) })
        : T('yIsk', { i: yuzde.format(d), s: yuzde.format(dm), a: yuzde.format(telafi) });
      $('tfYorum').textContent = y;
    };
    $('tf').addEventListener('input', function () { ilkKullanim('arac-teklif-fiyati'); tf(); });
    tf();
  }

  // ---------------------------------------------------------------- üretim termini
  if ($('tm')) {
    doldur({ adet: [1200, 1200], hiz: [25, 25], gunSaat: [8, 8], haftaGun: [6, 5], verim: [65, 65], kurulum: [2, 2], bekleyen: [4, 4] });
    var gunBicim = new Intl.DateTimeFormat(dil, { weekday: 'long', day: 'numeric', month: 'long' });
    var isoGun = function (t) { return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); };
    var bugun = new Date(); bugun.setHours(12, 0, 0, 0);
    if (!$('terminTarih').value) { var v = new Date(bugun); v.setDate(v.getDate() + 21); $('terminTarih').value = isoGun(v); }
    var tm = function () {
      var hg = Math.min(Math.max(Math.round(deger('haftaGun')) || 5, 1), 7);
      // hafta tatili sondan: 5 → cumartesi + pazar, 6 → pazar
      var isGunu = function (t) { var g = (t.getDay() + 6) % 7; return g < hg; };
      var ileri = function (t, n) { var x = new Date(t); while (n > 0) { x.setDate(x.getDate() + 1); if (isGunu(x)) n--; } return x; };
      var arada = function (a, b) { var n = 0, x = new Date(a); while (x < b) { x.setDate(x.getDate() + 1); if (isGunu(x)) n++; } return n; };
      var ilkGun = function (t) { var x = new Date(t); while (!isGunu(x)) x.setDate(x.getDate() + 1); return x; };
      var A = deger('adet'), H = deger('hiz'), S = deger('gunSaat'), V = deger('verim') / 100, K = deger('kurulum'), B = Math.ceil(deger('bekleyen'));
      if (!H || !S || !V) return;
      var saat = A / (H * V) + K, gun = Math.max(Math.ceil(saat / S), 1);
      var bas = B > 0 ? ileri(ilkGun(bugun), B) : ilkGun(bugun);
      var bit = ileri(bas, gun - 1);
      var tamGun = Math.max(Math.ceil((A / H + K) / S), 1), tamBit = ileri(bas, tamGun - 1);
      yaz('bitis', gunBicim.format(bit));
      yaz('sure', T('gunDeger', { s: sayi.format(gun) }));
      yaz('sureSaat', T('saatDeger', { s: sayi.format(Math.round(saat)) }));
      yaz('baslama', gunBicim.format(bas));
      yaz('tamVerim', gunBicim.format(tamBit));
      var tv = $('terminTarih').value, hedef = tv ? new Date(tv + 'T12:00:00') : null;
      if (!hedef || isNaN(hedef)) { yaz('kalan', '–'); yaz('gerekSaat', '–'); $('tmYorum').textContent = ''; $('bitisAlt').textContent = ''; return; }
      yaz('kalan', T('gunDeger', { s: sayi.format(arada(bugun, hedef) + (isGunu(bugun) ? 1 : 0)) }));
      var musait = bas <= hedef ? arada(bas, hedef) + 1 : 0;
      var gerek = musait ? saat / musait : 0;
      yaz('gerekSaat', musait && gerek <= 24 ? T('saatGun', { s: sayi.format(Math.ceil(gerek)) }) : T('yok'));
      var y, e = $('bitis');
      if (bit <= hedef) {
        var pay = arada(bit, hedef);
        e.className = 'deger ' + (pay <= 2 ? 'orta' : 'iyi');
        y = T(pay <= 2 ? 'ySinir' : 'yYetisir', { g: sayi.format(pay) });
      } else {
        var gec = arada(hedef, bit);
        e.className = 'deger kotu';
        y = T(musait && gerek <= 24 ? 'yGec' : 'yImkansiz', { g: sayi.format(gec), s: sayi.format(Math.ceil(gerek)), t: gunBicim.format(bit) });
      }
      $('bitisAlt').textContent = '';
      $('tmYorum').textContent = y;
    };
    $('tm').addEventListener('input', function () { ilkKullanim('arac-termin'); tm(); });
    tm();
  }

  // ---------------------------------------------------------------- OEE
  if ($('oe')) {
    doldur({ planli: [480, 480], durus: [70, 70], cevrim: [30, 30], uretilen: [700, 700], hatali: [21, 21] });
    var oe = function () {
      var Pl = deger('planli'), D = Math.min(deger('durus'), Pl), C = deger('cevrim'), N = deger('uretilen'), F = Math.min(deger('hatali'), N);
      var calisma = Pl - D;
      if (!Pl || !C) return;
      var A = calisma / Pl, P = calisma ? (C * N / 60) / calisma : 0, Q = N ? (N - F) / N : 0;
      var O = A * Math.min(P, 1) * Q;
      var kD = D, kH = Math.max(calisma - C * N / 60, 0), kQ = F * C / 60;
      var maks = Pl * 60 / C, iyi = N - F;
      var bar = function (id, v) { $('c' + id).style.width = Math.min(v, 1) * 100 + '%'; yaz('v' + id, yuzde.format(v)); };
      bar('A', A); bar('P', P); bar('Q', Q);
      yaz('oeeDeger', yuzde.format(O), O >= 0.85 ? 'iyi' : O >= 0.6 ? 'orta' : 'kotu');
      yaz('oeeAlt', T('adetDeger', { s: sayi.format(iyi) }) + ' / ' + sayi.format(maks));
      yaz('kayipAdet', T('adetDeger', { s: sayi.format(Math.max(maks - iyi, 0)) }));
      yaz('kayipAlt', yuzde.format(1 - O));
      yaz('kDurus', T('dk', { s: sayi.format(kD) }));
      yaz('kHiz', T('dk', { s: sayi.format(kH) }));
      yaz('kKalite', T('dk', { s: sayi.format(kQ) }));
      yaz('ek85', O < 0.85 ? T('adetDeger', { s: sayi.format(maks * 0.85 - iyi) }) : '–');
      var kayip = [[kD, 'kDurus'], [kH, 'kHiz'], [kQ, 'kKalite']].sort(function (a, b) { return b[0] - a[0]; })[0];
      var v = { o: yuzde.format(O), k: T(kayip[1]), d: sayi.format(kayip[0]) };
      $('oeYorum').textContent = P > 1.001 ? T('yHata') : T(O >= 0.85 ? 'yDunya' : O >= 0.5 ? 'yOrta' : 'yDusuk', v);
    };
    $('oe').addEventListener('input', function () { ilkKullanim('arac-oee'); oe(); });
    oe();
  }

  // ---------------------------------------------------------------- Excel'in gizli maliyeti
  if ($('em')) {
    doldur({ kisi: [4, 4], tekrar: [5, 5], rapor: [24, 24], hata: [3, 3], hataMaliyet: [8000, 800], saatMaliyet: [320, 32] });
    var em = function () {
      var N = deger('kisi'), W = deger('tekrar'), R = deger('rapor'), E = deger('hata'), EC = deger('hataMaliyet'), C = deger('saatMaliyet');
      var sT = N * W * 48, sR = R * 12;
      var mT = sT * C, mR = sR * C, mH = E * 12 * EC, top = mT + mR + mH;
      yaz('yillikM', para.format(top));
      yaz('aylikM', para.format(top / 12) + ' / ' + T('ay'));
      yaz('kayipSaat', T('saatDeger', { s: sayi.format(sT + sR) }));
      yaz('kayipKisi', T('kisiDeger', { s: new Intl.NumberFormat(dil, { maximumFractionDigits: 1 }).format((sT + sR) / 1800) }));
      yaz('mTekrar', para.format(mT)); yaz('mRapor', para.format(mR)); yaz('mHata', para.format(mH));
      var serit = $('emSerit'); serit.innerHTML = '';
      [[mT, '#6366F1'], [mR, '#22D3EE'], [mH, '#F87171']].forEach(function (p) {
        var e = document.createElement('i'); e.style.width = (top ? p[0] / top * 100 : 0) + '%'; e.style.background = p[1]; serit.appendChild(e);
      });
      var b = [[mT, 'kTekrar'], [mR, 'kRapor'], [mH, 'kHata']].sort(function (a, c) { return c[0] - a[0]; })[0];
      $('emYorum').textContent = top ? T('yMaliyet', { y: para.format(top), b: yuzde.format(b[0] / top), k: T(b[1]),
        s: T('saatDeger', { s: sayi.format(sT + sR) }), c: T('kisiDeger', { s: new Intl.NumberFormat(dil, { maximumFractionDigits: 1 }).format((sT + sR) / 1800) }) }) : '';
    };
    $('em').addEventListener('input', function () { ilkKullanim('arac-excel-maliyeti'); em(); });
    em();
  }
})();
