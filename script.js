/* ═══════════════════════════════════════════════════════════
   IndianRail.gov — script.js  (FINAL)
   Full validation on every form & button
   No empty submits allowed anywhere
═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════
   UTILITY HELPERS
══════════════════════════════════════════════ */

// Toast notification (error = red border, success = green)
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.borderLeftColor =
    type === 'error'   ? '#C62828' :
    type === 'success' ? '#1B8A4C' : 'var(--orange)';
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Mark a field as invalid (red border + shake)
function markInvalid(el, msg) {
  el.style.borderColor = '#C62828';
  el.style.boxShadow  = '0 0 0 3px rgba(198,40,40,0.15)';
  el.focus();
  showToast('⚠ ' + msg, 'error');
  el.addEventListener('input', () => {
    el.style.borderColor = '';
    el.style.boxShadow  = '';
  }, { once: true });
}

// Clear all invalid states inside a container
function clearErrors(container) {
  container.querySelectorAll('input, select, textarea').forEach(el => {
    el.style.borderColor = '';
    el.style.boxShadow  = '';
  });
}

// Validate email format
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// Validate phone (Indian 10-digit)
function isValidPhone(p) { return /^[6-9]\d{9}$/.test(p.replace(/\s+/g,'')); }

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */

function showSection(id, clickedLink) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById(id);
  if (sec) {
    sec.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (clickedLink) clickedLink.classList.add('active');
  if (id === 'trains') populateTrainTable();
  if (id === 'home')   startCounters();
}

/* ══════════════════════════════════════════════
   HAMBURGER MENU
══════════════════════════════════════════════ */

function toggleMenu() {
  const nav = document.getElementById('mainNav');
  const btn = document.getElementById('hamburger');
  const isOpen = nav.classList.toggle('open');
  btn.classList.toggle('is-open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

/* ══════════════════════════════════════════════
   DOM READY — init everything
══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // Close menu on nav link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('mainNav').classList.remove('open');
      document.getElementById('hamburger').classList.remove('is-open');
      document.body.style.overflow = '';
    });
  });

  // Date inputs — set min = today, default = tomorrow
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  document.querySelectorAll('input[type=date]').forEach(d => {
    d.value = tomorrow;
    d.min   = today;
  });

  buildPassengerForms();
  initTicker();
  startCounters();
  initVideoBackground();
  populateTrainTable();

  // Pay method toggle — show/hide correct panel
  document.addEventListener('change', e => {
    if (e.target.name !== 'pay') return;
    const panels = { upi: 'payUpiWrap', card: 'payCardWrap', nb: 'payNbWrap', wallet: 'payWalletWrap' };
    Object.values(panels).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const target = panels[e.target.value];
    if (target) {
      const el = document.getElementById(target);
      if (el) el.style.display = 'block';
    }
  });

  // Train search on Enter key
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.activeElement.id === 'trainSearch') searchTrains();
    if (e.key === 'Enter' && document.activeElement.id === 'pnrInput')    checkPNR();
  });

  // Scroll-to-top button
  window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollTopBtn');
    if (btn) btn.classList.toggle('visible', window.scrollY > 320);
  });
});

/* ══════════════════════════════════════════════
   QUICK SEARCH (Home hero bar)
══════════════════════════════════════════════ */

function setTripType(type, btn) {
  document.querySelectorAll('.qs-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

function swapStations() {
  const a = document.getElementById('qsFrom');
  const b = document.getElementById('qsTo');
  if (!a || !b) return;
  [a.value, b.value] = [b.value, a.value];
}

function doSearch() {
  const from = document.getElementById('qsFrom');
  const to   = document.getElementById('qsTo');
  const date = document.getElementById('qsDate');

  clearErrors(document.querySelector('.quick-search-card'));

  if (!from.value.trim()) { markInvalid(from, 'Please enter departure station'); return; }
  if (!to.value.trim())   { markInvalid(to,   'Please enter destination station'); return; }
  if (from.value.trim().toLowerCase() === to.value.trim().toLowerCase()) {
    markInvalid(to, 'Departure and destination cannot be same'); return;
  }
  if (!date.value) { markInvalid(date, 'Please select journey date'); return; }

  // Copy values to booking form
  document.getElementById('bFrom').value = from.value;
  document.getElementById('bTo').value   = to.value;
  document.getElementById('bDate').value = date.value;

  showSection('booking', document.querySelector('[onclick*="booking"]'));
  showToast('✅ Trains found for your route!', 'success');
}

/* ══════════════════════════════════════════════
   PASSENGER COUNT
══════════════════════════════════════════════ */

let paxCount = 1;

function changeCount(delta) {
  paxCount = Math.max(1, Math.min(6, paxCount + delta));
  document.getElementById('passengerCount').textContent = paxCount;
  buildPassengerForms();
}

function buildPassengerForms() {
  const wrap = document.getElementById('passengerForms');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 1; i <= paxCount; i++) {
    wrap.innerHTML += `
      <div class="pax-entry" id="paxEntry${i}">
        <h4>Passenger ${i}</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Full Name <span class="req">*</span></label>
            <input type="text" id="paxName${i}" placeholder="As per Govt. ID" maxlength="60"/>
          </div>
          <div class="form-group">
            <label>Age <span class="req">*</span></label>
            <input type="number" id="paxAge${i}" min="1" max="120" placeholder="e.g. 28"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Gender <span class="req">*</span></label>
            <select id="paxGender${i}">
              <option value="">-- Select --</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Berth Preference</label>
            <select id="paxBerth${i}">
              <option>No Preference</option><option>Lower</option>
              <option>Middle</option><option>Upper</option>
              <option>Side Lower</option><option>Side Upper</option>
            </select>
          </div>
        </div>
      </div>`;
  }
}

/* ══════════════════════════════════════════════
   BOOKING — STEP 1: Journey Details Validation
══════════════════════════════════════════════ */

function nextStep(n) {
  // Validate before moving forward
  if (n === 2 && !validateStep1()) return;
  if (n === 3 && !validateStep2()) return;

  const panels = document.querySelectorAll('.bf-panel');
  const btns   = document.querySelectorAll('.bf-step');

  panels.forEach(p => p.classList.remove('active'));
  btns.forEach((b, i) => {
    b.classList.remove('active', 'done');
    if (i + 1 < n)  b.classList.add('done');
    if (i + 1 === n) b.classList.add('active');
  });

  const target = document.getElementById('step' + n);
  if (target) { target.classList.add('active'); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  if (n === 2) buildPassengerForms();
}

function validateStep1() {
  const from  = document.getElementById('bFrom');
  const to    = document.getElementById('bTo');
  const date  = document.getElementById('bDate');

  clearErrors(document.getElementById('step1'));

  if (!from.value.trim()) { markInvalid(from, 'Please enter From station'); return false; }
  if (!to.value.trim())   { markInvalid(to,   'Please enter To station');   return false; }
  if (from.value.trim().toLowerCase() === to.value.trim().toLowerCase()) {
    markInvalid(to, 'From and To stations cannot be the same'); return false;
  }
  if (!date.value) { markInvalid(date, 'Please select journey date'); return false; }

  return true;
}

/* ══════════════════════════════════════════════
   BOOKING — STEP 2: Passenger Details Validation
══════════════════════════════════════════════ */

function validateStep2() {
  clearErrors(document.getElementById('step2'));

  for (let i = 1; i <= paxCount; i++) {
    const name   = document.getElementById('paxName'   + i);
    const age    = document.getElementById('paxAge'    + i);
    const gender = document.getElementById('paxGender' + i);

    if (!name || !name.value.trim()) {
      markInvalid(name, `Passenger ${i}: Full name is required`); return false;
    }
    if (name.value.trim().length < 3) {
      markInvalid(name, `Passenger ${i}: Enter a valid full name`); return false;
    }
    if (!age || !age.value || age.value < 1 || age.value > 120) {
      markInvalid(age, `Passenger ${i}: Enter a valid age (1–120)`); return false;
    }
    if (!gender || !gender.value) {
      markInvalid(gender, `Passenger ${i}: Please select gender`); return false;
    }
  }

  const mobile = document.getElementById('contactMobile');
  const email  = document.getElementById('contactEmail');

  if (!mobile || !mobile.value.trim()) {
    markInvalid(mobile, 'Contact mobile number is required'); return false;
  }
  const digits = mobile.value.replace(/\D/g, '');
  if (digits.length < 10) {
    markInvalid(mobile, 'Enter a valid 10-digit mobile number'); return false;
  }

  if (!email || !email.value.trim()) {
    markInvalid(email, 'Email address is required'); return false;
  }
  if (!isValidEmail(email.value.trim())) {
    markInvalid(email, 'Enter a valid email address (e.g. name@example.com)'); return false;
  }

  return true;
}

/* ══════════════════════════════════════════════
   BOOKING — STEP 3: Payment Validation & Confirm
══════════════════════════════════════════════ */

function confirmPayment() {
  const payMethod = document.querySelector('input[name="pay"]:checked');
  if (!payMethod) { showToast('⚠ Please select a payment method', 'error'); return; }

  // UPI validation
  if (payMethod.value === 'upi') {
    const upiInput = document.querySelector('#payUpiWrap input[type=text]');
    if (!upiInput || !upiInput.value.trim()) {
      markInvalid(upiInput, 'Please enter your UPI ID'); return;
    }
    if (!/^[\w.\-]{2,}@[\w]{2,}$/.test(upiInput.value.trim())) {
      markInvalid(upiInput, 'Invalid UPI ID format (e.g. name@upi)'); return;
    }
  }

  // Card validation
  if (payMethod.value === 'card') {
    const cardNum = document.querySelector('#payCardWrap #cardNumber');
    const cardExp = document.querySelector('#payCardWrap #cardExpiry');
    const cardCvv = document.querySelector('#payCardWrap #cardCvv');
    const cardName= document.querySelector('#payCardWrap #cardName');
    if (!cardName || !cardName.value.trim()) { markInvalid(cardName, 'Enter name on card'); return; }
    if (!cardNum  || cardNum.value.replace(/\s/g,'').length < 16) { markInvalid(cardNum, 'Enter valid 16-digit card number'); return; }
    if (!cardExp  || !/^\d{2}\/\d{2}$/.test(cardExp.value.trim())) { markInvalid(cardExp, 'Enter expiry as MM/YY'); return; }
    if (!cardCvv  || !/^\d{3,4}$/.test(cardCvv.value.trim())) { markInvalid(cardCvv, 'Enter valid CVV (3-4 digits)'); return; }
  }

  // Net banking validation
  if (payMethod.value === 'nb') {
    const nbSelect = document.querySelector('#payNbWrap select');
    if (!nbSelect || !nbSelect.value) { markInvalid(nbSelect, 'Please select your bank'); return; }
  }

  // Wallet validation
  if (payMethod.value === 'wallet') {
    const wSelect = document.getElementById('walletSelect');
    const wMobile = document.getElementById('walletMobile');
    if (!wSelect || !wSelect.value) { markInvalid(wSelect, 'Please select a wallet'); return; }
    if (!wMobile || wMobile.value.length < 10) { markInvalid(wMobile, 'Enter valid 10-digit mobile for wallet'); return; }
  }

  // Terms checkbox
  const terms = document.getElementById('agreeTerms');
  if (!terms.checked) {
    terms.style.outline = '2px solid #C62828';
    showToast('⚠ Please agree to Terms & Conditions', 'error');
    terms.addEventListener('change', () => { terms.style.outline = ''; }, { once: true });
    return;
  }

  // All good — show processing then success
  const payBtn = document.querySelector('.btn-pay');
  if (payBtn) { payBtn.disabled = true; payBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing...'; }

  setTimeout(() => {
    const pnr = Math.floor(2000000000 + Math.random() * 999999999);
    showSuccessModal(pnr);
    if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = '<i class="fa fa-lock"></i> Pay ₹1,411.75 Securely'; }
  }, 2000);
}

function showSuccessModal(pnr) {
  // Remove any old modal
  const old = document.getElementById('successModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'successModal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(10,22,40,0.85);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;`;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:40px 32px;max-width:460px;width:100%;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.3);">
      <div style="width:72px;height:72px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;">✅</div>
      <h2 style="font-family:'Rajdhani',sans-serif;font-size:26px;color:#0A1628;margin-bottom:8px;">Booking Confirmed!</h2>
      <p style="color:#4a5568;margin-bottom:20px;">Your e-Ticket has been sent to your registered email & mobile.</p>
      <div style="background:#f4f7ff;border-radius:10px;padding:16px;margin-bottom:24px;">
        <div style="font-size:12px;color:#8898aa;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Your PNR Number</div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:32px;font-weight:700;color:#FF6B00;letter-spacing:3px;">${pnr}</div>
        <div style="font-size:12px;color:#4a5568;margin-top:4px;">Save this for reference</div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button onclick="closeModal();showSection('pnr',document.querySelector('[onclick*=pnr]'))"
          style="padding:11px 22px;background:#FF6B00;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
          <i class="fa fa-search"></i> Check PNR Status
        </button>
        <button onclick="closeModal();nextStep(1)"
          style="padding:11px 22px;background:#f4f7ff;color:#0A1628;border:1.5px solid #E0E7F0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
          Book Another
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  // Store PNR for auto-fill
  document.getElementById('pnrInput') && (document.getElementById('pnrInput').value = pnr);
}

function closeModal() {
  const m = document.getElementById('successModal');
  if (m) m.remove();
}

/* ══════════════════════════════════════════════
   PNR STATUS CHECK
══════════════════════════════════════════════ */

function checkPNR() {
  const input = document.getElementById('pnrInput');
  const val   = input.value.replace(/\D/g, '').trim();

  if (!val) { markInvalid(input, 'Please enter your PNR number'); return; }
  if (val.length !== 10) { markInvalid(input, 'PNR must be exactly 10 digits'); return; }

  // Show loading state
  const btn = document.querySelector('.pnr-input-wrap .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Checking...'; }

  setTimeout(() => {
    document.getElementById('pnrResult').style.display = 'block';
    document.getElementById('pnrDisplayNum').textContent = val;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-search"></i> Check Status'; }
    showToast('✅ PNR status fetched successfully!', 'success');
    document.getElementById('pnrResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1200);
}

/* ══════════════════════════════════════════════
   TRAIN SCHEDULE — Search with validation
══════════════════════════════════════════════ */

const trainsDB = [
  { no:'12301', name:'Howrah Rajdhani Express',    from:'New Delhi (NDLS)',    dep:'16:55', to:'Kolkata Howrah (HWH)',   arr:'10:25', days:'Daily',    status:'on-time', statusText:'On Time'     },
  { no:'12951', name:'Mumbai Rajdhani Express',    from:'New Delhi (NDLS)',    dep:'17:00', to:'Mumbai Central (BCT)',   arr:'08:15', days:'Daily',    status:'on-time', statusText:'On Time'     },
  { no:'22436', name:'Vande Bharat Express',       from:'New Delhi (NDLS)',    dep:'06:00', to:'Varanasi (BSB)',         arr:'14:00', days:'Daily',    status:'on-time', statusText:'On Time'     },
  { no:'12627', name:'Karnataka Express',          from:'New Delhi (NDLS)',    dep:'22:30', to:'Bengaluru City (SBC)',   arr:'04:30', days:'Daily',    status:'delayed', statusText:'Late 30 min' },
  { no:'12001', name:'Shatabdi Express',           from:'New Delhi (NDLS)',    dep:'06:00', to:'Bhopal (BPL)',           arr:'14:00', days:'Mon–Sat',  status:'on-time', statusText:'On Time'     },
  { no:'12953', name:'August Kranti Rajdhani',     from:'New Delhi (NDLS)',    dep:'17:30', to:'Mumbai Central (BCT)',   arr:'10:55', days:'Daily',    status:'on-time', statusText:'On Time'     },
  { no:'14112', name:'Lucknow Mail',               from:'New Delhi (NDLS)',    dep:'22:00', to:'Lucknow (LKO)',          arr:'05:15', days:'Daily',    status:'on-time', statusText:'On Time'     },
  { no:'12902', name:'Gujarat Mail',               from:'Mumbai Central (BCT)',dep:'22:05', to:'Ahmedabad (ADI)',        arr:'05:00', days:'Daily',    status:'on-time', statusText:'On Time'     },
  { no:'12163', name:'Chennai Express',            from:'Mumbai CSMT (CSMT)', dep:'21:00', to:'Chennai Central (MAS)',  arr:'15:40', days:'Daily',    status:'delayed', statusText:'Late 45 min' },
  { no:'12987', name:'Ajmer Shatabdi',             from:'New Delhi (NDLS)',    dep:'06:05', to:'Ajmer (AII)',            arr:'13:10', days:'Daily',    status:'on-time', statusText:'On Time'     },
];

function populateTrainTable(data) {
  const tbody = document.getElementById('trainTableBody');
  if (!tbody) return;
  const list = data || trainsDB;
  tbody.innerHTML = list.map(t => `
    <tr>
      <td><strong style="color:var(--navy)">${t.no}</strong></td>
      <td><strong>${t.name}</strong></td>
      <td>${t.from}</td>
      <td><strong style="font-family:'Rajdhani',sans-serif;font-size:16px">${t.dep}</strong></td>
      <td>${t.to}</td>
      <td><strong style="font-family:'Rajdhani',sans-serif;font-size:16px">${t.arr}</strong></td>
      <td><span style="font-size:12px">${t.days}</span></td>
      <td><span class="status-dot ${t.status}"></span>${t.statusText}</td>
    </tr>`).join('');
}

function searchTrains() {
  const input = document.getElementById('trainSearch');
  const q = input.value.trim().toLowerCase();

  if (!q) {
    populateTrainTable();
    showToast('Showing all trains', 'info');
    return;
  }
  const filtered = trainsDB.filter(t =>
    t.no.includes(q) || t.name.toLowerCase().includes(q) ||
    t.from.toLowerCase().includes(q) || t.to.toLowerCase().includes(q)
  );
  populateTrainTable(filtered);
  if (!filtered.length) {
    document.getElementById('trainTableBody').innerHTML = `
      <tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">
        <i class="fa fa-search" style="font-size:28px;display:block;margin-bottom:12px;opacity:0.3;"></i>
        No trains found for <strong>"${q}"</strong>.<br/>
        <small>Try train number, name or station name</small>
      </td></tr>`;
  } else {
    showToast(`✅ Found ${filtered.length} train(s)`, 'success');
  }
}

/* ══════════════════════════════════════════════
   CONTACT FORM — Full Validation
══════════════════════════════════════════════ */

function submitContact() {
  const section = document.getElementById('contact');
  clearErrors(section);

  const name    = section.querySelector('input[type=text]');
  const email   = section.querySelector('input[type=email]');
  const pnrRef  = section.querySelectorAll('input[type=text]')[1];
  const subject = section.querySelector('select');
  const msg     = section.querySelector('textarea');

  if (!name || !name.value.trim()) {
    markInvalid(name, 'Please enter your full name'); return;
  }
  if (name.value.trim().length < 3) {
    markInvalid(name, 'Name must be at least 3 characters'); return;
  }
  if (!email || !email.value.trim()) {
    markInvalid(email, 'Please enter your email address'); return;
  }
  if (!isValidEmail(email.value.trim())) {
    markInvalid(email, 'Enter a valid email (e.g. name@example.com)'); return;
  }
  if (!msg || !msg.value.trim()) {
    markInvalid(msg, 'Please describe your issue'); return;
  }
  if (msg.value.trim().length < 20) {
    markInvalid(msg, 'Message must be at least 20 characters'); return;
  }

  // Submit — show loader on button
  const btn = section.querySelector('.btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Submitting...'; }

  setTimeout(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-paper-plane"></i> Submit Query'; }
    // Clear form
    if (name)    name.value    = '';
    if (email)   email.value   = '';
    if (pnrRef)  pnrRef.value  = '';
    if (subject) subject.selectedIndex = 0;
    if (msg)     msg.value     = '';
    showToast('✅ Query submitted! We\'ll respond within 24 hours.', 'success');
  }, 1500);
}

/* ══════════════════════════════════════════════
   TICKER
══════════════════════════════════════════════ */

function initTicker() {
  const notices = [
    '⚡ Train 12302 Howrah Rajdhani will be 45 min late on 27 June 2026',
    '🎟 Tatkal booking for festival season opens 1st July 2026 at 10:00 AM',
    '🚄 New Vande Bharat Express Delhi–Varanasi now runs 7 days a week',
    '👴 Senior citizen concession (40%) restored on all Mail/Express trains from July 2026',
    '📱 Download official IndianRail app for easy booking and PNR status on the go',
  ];
  const el = document.getElementById('tickerText');
  if (el) el.textContent = notices.join('   •   ');
}

/* ══════════════════════════════════════════════
   STAT COUNTER ANIMATION
══════════════════════════════════════════════ */

function startCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    if (!target) return;
    let current = 0;
    el.textContent = '0';
    const step = Math.ceil(target / 60);
    const iv = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString('en-IN');
      if (current >= target) clearInterval(iv);
    }, 24);
  });
}

/* ══════════════════════════════════════════════
   VIDEO BACKGROUND
══════════════════════════════════════════════ */

function initVideoBackground() {
  const video = document.getElementById('heroBgVideo');
  if (!video) return;
  video.muted = true;
  video.play().catch(() => {});
}

/* ══════════════════════════════════════════════
   CSS: inject required .req style
══════════════════════════════════════════════ */

(function injectReqStyle() {
  const s = document.createElement('style');
  s.textContent = `
    .req { color: #C62828; font-size: 11px; }
    .btn-pay:disabled, .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    .hamburger span { transition: all 0.25s ease; transform-origin: center; }
    .hamburger.is-open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .hamburger.is-open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    .hamburger.is-open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
  `;
  document.head.appendChild(s);
})();


/* ══════════════════════════════════════════════
   MODAL SYSTEM — Open / Close / Overlay click
══════════════════════════════════════════════ */

function openModal(id, e) {
  if (e) e.preventDefault();
  // Close any open modal first
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOverlay(e, id) {
  // Close only if clicking the dark backdrop (not the box)
  if (e.target === document.getElementById(id)) closeModal(id);
}

// Close modals on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
});

/* ══════════════════════════════════════════════
   PASSWORD — Toggle eye & Strength meter
══════════════════════════════════════════════ */

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.innerHTML = isText ? '<i class="fa fa-eye"></i>' : '<i class="fa fa-eye-slash"></i>';
}

function checkPassStrength(val) {
  const bar  = document.getElementById('passBar');
  const hint = document.getElementById('passHint');
  if (!bar || !hint) return;

  let score = 0;
  if (val.length >= 8)              score++;
  if (/[A-Z]/.test(val))           score++;
  if (/[0-9]/.test(val))           score++;
  if (/[^A-Za-z0-9]/.test(val))   score++;

  const levels = [
    { pct:'20%', color:'#C62828', label:'Weak — too short'            },
    { pct:'40%', color:'#E65100', label:'Fair — add uppercase'        },
    { pct:'65%', color:'#F9A825', label:'Good — add numbers'          },
    { pct:'85%', color:'#558B2F', label:'Strong'                      },
    { pct:'100%',color:'#1B8A4C', label:'Very Strong ✓'               },
  ];
  const lvl = levels[Math.min(score, 4)];
  bar.style.width      = val.length === 0 ? '0%' : lvl.pct;
  bar.style.background = lvl.color;
  hint.textContent     = val.length === 0 ? '' : lvl.label;
  hint.style.color     = lvl.color;
}

/* ══════════════════════════════════════════════
   SIGN IN — Validate & submit
══════════════════════════════════════════════ */

// Simple in-memory user store (demo)
const userStore = [];

function doSignIn() {
  const user = document.getElementById('siUser');
  const pass = document.getElementById('siPass');
  const btn  = document.querySelector('#signinForm .btn-modal-primary');

  // Clear errors
  [user, pass].forEach(el => { el.style.borderColor = ''; el.style.boxShadow = ''; });

  if (!user.value.trim()) { markInvalid(user, 'Please enter your mobile, email or User ID'); return; }
  if (!pass.value)        { markInvalid(pass, 'Please enter your password'); return; }
  if (pass.value.length < 6) { markInvalid(pass, 'Password must be at least 6 characters'); return; }

  // Check against registered users (demo)
  const found = userStore.find(u =>
    (u.mobile === user.value.trim() || u.email === user.value.trim()) && u.pass === pass.value
  );

  if (userStore.length > 0 && !found) {
    markInvalid(pass, 'Incorrect credentials. Try again or register.');
    return;
  }

  // Show loading
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Signing In...';

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Sign In';

    const displayName = found ? found.fname : user.value.split('@')[0];

    // Show success state
    document.getElementById('signinForm').style.display    = 'none';
    document.getElementById('signinSuccess').style.display = 'block';
    document.getElementById('siWelcomeName').textContent   =
      (isHindi ? `नमस्ते, ${displayName}!` : `Welcome, ${displayName}! You're now signed in.`);

    // Update header topbar
    updateHeaderAfterLogin(displayName);

    // Auto close after 2s
    setTimeout(() => {
      closeModal('signinModal');
      document.getElementById('signinForm').style.display    = '';
      document.getElementById('signinSuccess').style.display = 'none';
      user.value = ''; pass.value = '';
    }, 2000);

  }, 1400);
}

/* ══════════════════════════════════════════════
   REGISTER — Validate & submit
══════════════════════════════════════════════ */

function doRegister() {
  const fname  = document.getElementById('regFname');
  const lname  = document.getElementById('regLname');
  const mobile = document.getElementById('regMobile');
  const email  = document.getElementById('regEmail');
  const dob    = document.getElementById('regDob');
  const pass   = document.getElementById('regPass');
  const passC  = document.getElementById('regPassConf');
  const gender = document.getElementById('regGender');
  const terms  = document.getElementById('regTerms');
  const btn    = document.querySelector('#registerForm .btn-modal-primary');

  // Clear
  [fname,lname,mobile,email,dob,pass,passC,gender].forEach(el => {
    el.style.borderColor = ''; el.style.boxShadow = '';
  });

  if (!fname.value.trim() || fname.value.trim().length < 2)
    { markInvalid(fname, 'Enter your first name (min 2 chars)'); return; }
  if (!lname.value.trim() || lname.value.trim().length < 2)
    { markInvalid(lname, 'Enter your last name (min 2 chars)'); return; }
  if (!mobile.value || mobile.value.length !== 10)
    { markInvalid(mobile, 'Enter a valid 10-digit mobile number'); return; }
  if (!/^[6-9]/.test(mobile.value))
    { markInvalid(mobile, 'Mobile must start with 6, 7, 8 or 9'); return; }
  if (!email.value.trim() || !isValidEmail(email.value.trim()))
    { markInvalid(email, 'Enter a valid email address'); return; }
  if (!dob.value)
    { markInvalid(dob, 'Please select your date of birth'); return; }

  // Age check — must be at least 5
  const age = (new Date() - new Date(dob.value)) / (1000*60*60*24*365);
  if (age < 5) { markInvalid(dob, 'Invalid date of birth'); return; }

  if (!pass.value || pass.value.length < 8)
    { markInvalid(pass, 'Password must be at least 8 characters'); return; }
  if (pass.value !== passC.value)
    { markInvalid(passC, 'Passwords do not match'); return; }
  if (!gender.value)
    { markInvalid(gender, 'Please select gender'); return; }
  if (!terms.checked) {
    terms.style.outline = '2px solid #C62828';
    showToast('⚠ Please agree to Terms & Conditions', 'error');
    terms.addEventListener('change', () => { terms.style.outline = ''; }, { once: true });
    return;
  }

  // Check duplicate mobile/email
  if (userStore.find(u => u.mobile === mobile.value || u.email === email.value.trim())) {
    markInvalid(email, 'This mobile/email is already registered. Please sign in.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creating Account...';

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-user-plus"></i> Create Account';

    // Save user
    userStore.push({
      fname: fname.value.trim(),
      lname: lname.value.trim(),
      mobile: mobile.value,
      email: email.value.trim().toLowerCase(),
      pass: pass.value,
      gender: gender.value,
      dob: dob.value
    });

    // Show success
    document.getElementById('registerForm').style.display    = 'none';
    document.getElementById('registerSuccess').style.display = 'block';
    document.getElementById('regWelcomeName').textContent    =
      (isHindi ? `${fname.value.trim()} जी, आपका खाता बन गया!` : `Hello ${fname.value.trim()}! Your account is ready.`);

    showToast('🎉 Account created successfully!', 'success');

    setTimeout(() => {
      document.getElementById('registerForm').style.display    = '';
      document.getElementById('registerSuccess').style.display = 'none';
      // Pre-fill sign in
      closeModal('registerModal');
      openModal('signinModal', null);
      document.getElementById('siUser').value = mobile.value;
    }, 2200);

  }, 1600);
}

/* ══════════════════════════════════════════════
   FORGOT PASSWORD
══════════════════════════════════════════════ */

function doForgotPass() {
  const input = document.getElementById('forgotInput');
  const btn   = document.querySelector('#forgotForm .btn-modal-primary');

  input.style.borderColor = ''; input.style.boxShadow = '';

  if (!input.value.trim()) {
    markInvalid(input, 'Please enter your registered mobile or email'); return;
  }
  const val = input.value.trim();
  const validEmail  = isValidEmail(val);
  const validMobile = /^[6-9]\d{9}$/.test(val);
  if (!validEmail && !validMobile) {
    markInvalid(input, 'Enter a valid email or 10-digit mobile number'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-paper-plane"></i> Send Reset Link';
    document.getElementById('forgotForm').style.display    = 'none';
    document.getElementById('forgotSuccess').style.display = 'block';
    showToast('📧 Reset link sent successfully!', 'success');

    setTimeout(() => {
      document.getElementById('forgotForm').style.display    = '';
      document.getElementById('forgotSuccess').style.display = 'none';
      input.value = '';
    }, 3000);
  }, 1400);
}

/* ══════════════════════════════════════════════
   LANGUAGE TOGGLE — English ↔ Hindi
══════════════════════════════════════════════ */

let isHindi = false;

function toggleLanguage(e) {
  if (e) e.preventDefault();
  isHindi = !isHindi;

  // Toggle all .lang-en and .lang-hi elements
  document.querySelectorAll('.lang-en').forEach(el => {
    el.style.display = isHindi ? 'none' : '';
  });
  document.querySelectorAll('.lang-hi').forEach(el => {
    el.style.display = isHindi ? '' : 'none';
  });

  // Update button label & icon color
  const lbl = document.getElementById('langLabel');
  const btn = document.getElementById('langToggleBtn');
  if (lbl) lbl.textContent = isHindi ? 'English' : 'हिन्दी';
  if (btn) btn.classList.toggle('lang-active', isHindi);

  showToast(isHindi ? '✅ भाषा हिन्दी में बदली गई' : '✅ Language changed to English', 'success');
}

/* ══════════════════════════════════════════════
   UPDATE HEADER after login
══════════════════════════════════════════════ */

function updateHeaderAfterLogin(name) {
  const topRight = document.querySelector('.top-bar-right');
  if (!topRight) return;

  // Replace Sign In + Register with user badge + logout
  topRight.innerHTML = `
    <span class="header-user-badge">
      <i class="fa fa-user-circle"></i> ${name}
    </span>
    <a href="#" onclick="doLogout(event)" style="color:rgba(255,255,255,0.7);font-size:12px;text-decoration:none;">
      <i class="fa fa-sign-out-alt"></i> Logout
    </a>`;
}

function doLogout(e) {
  if (e) e.preventDefault();
  location.reload();
}