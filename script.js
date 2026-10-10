(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const toast = $('#toast');
  let toastTimer;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }
  function setBodyDialogState() {
    document.body.classList.toggle('dialog-open', Boolean($$('dialog[open]').length));
  }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('close', setBodyDialogState);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    $('.dialog-close', dialog)?.addEventListener('click', () => dialog.close());
  });

  // Mobile navigation
  const menuToggle = $('.menu-toggle');
  const nav = $('.main-nav');
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  $$('.main-nav a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));

  // Reveal content as it enters the viewport, with a reduced-motion fallback.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
  } else revealItems.forEach(item => item.classList.add('visible'));

  // Navigation section state
  const sections = $$('main section[id]');
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      $$('.nav-link').forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}` || (id === 'story-details' && link.getAttribute('href') === '#story')));
    }), { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach(section => sectionObserver.observe(section));
  }

  // Menu category filters
  $$('.filter-tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.filter-tab').forEach(item => item.classList.toggle('active', item === tab));
    const category = tab.dataset.filter;
    $$('.dish-card').forEach(card => card.classList.toggle('is-hidden', category !== 'all' && card.dataset.category !== category));
  }));

  // Dish detail modal
  const dishDialog = $('#dish-dialog');
  $$('.dish-card').forEach(card => $('.dish-image', card).addEventListener('click', () => {
    $('#dialog-image').src = $('.dish-image img', card).src;
    $('#dialog-image').alt = $('.dish-image img', card).alt;
    $('#dialog-tags').textContent = card.dataset.tags;
    $('#dialog-title').textContent = card.dataset.name;
    $('#dialog-description').textContent = card.dataset.description;
    $('#dialog-price').textContent = card.dataset.price;
    dishDialog.showModal();
    setBodyDialogState();
  }));
  $('.dialog-reserve').addEventListener('click', () => dishDialog.close());

  // Accessible gallery lightbox with previous/next and keyboard support.
  const galleryButtons = $$('.gallery-item');
  const galleryDialog = $('#gallery-dialog');
  const galleryImage = $('#gallery-dialog-image');
  let galleryIndex = 0;
  function showGalleryImage(index) {
    galleryIndex = (index + galleryButtons.length) % galleryButtons.length;
    const button = galleryButtons[galleryIndex];
    galleryImage.src = button.dataset.full;
    galleryImage.alt = $('img', button).alt;
    $('.gallery-dialog-count').textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(galleryButtons.length).padStart(2, '0')}`;
  }
  galleryButtons.forEach((button, index) => button.addEventListener('click', () => {
    showGalleryImage(index);
    galleryDialog.showModal();
    setBodyDialogState();
  }));
  $('.gallery-prev').addEventListener('click', () => showGalleryImage(galleryIndex - 1));
  $('.gallery-next').addEventListener('click', () => showGalleryImage(galleryIndex + 1));
  galleryDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showGalleryImage(galleryIndex - 1);
    if (event.key === 'ArrowRight') showGalleryImage(galleryIndex + 1);
  });

  // Date cannot be earlier than today.
  const dateInput = $('#reservation-date');
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  dateInput.min = localToday;

  // Demo reservation: validates locally and creates a printable sample ticket only.
  const reservationForm = $('#reservation-form');
  const confirmationDialog = $('#confirmation-dialog');
  reservationForm.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(reservationForm);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const date = String(formData.get('date') || '');
    const time = String(formData.get('time') || '');
    const guests = String(formData.get('guests') || '');
    const consent = formData.get('demoConsent');
    const message = $('#reservation-message');
    message.textContent = '';
    if (name.length < 2) { message.textContent = 'Please enter your name (at least 2 characters).'; $('input[name="name"]', reservationForm).focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { message.textContent = 'Please enter a valid email address.'; $('input[name="email"]', reservationForm).focus(); return; }
    if (!date || date < localToday || !time || !guests) { message.textContent = 'Please choose a valid date, time and party size.'; return; }
    if (!consent) { message.textContent = 'Please confirm you understand this is a demo request.'; return; }
    const reference = `SV-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${String(Date.now()).slice(-4)}`;
    $('#ticket-reference').textContent = reference;
    const details = $('#ticket-details');
    details.replaceChildren();
    [
      ['GUEST', name], ['DATE', new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
      ['TIME', time], ['PARTY', guests], ['SEATING', String(formData.get('seating') || 'Surprise me')], ['NOTE', String(formData.get('notes') || '').trim() || 'No additional note']
    ].forEach(([label, value]) => {
      const item = document.createElement('div'); item.className = 'ticket-detail';
      const labelEl = document.createElement('span'); labelEl.textContent = label;
      const valueEl = document.createElement('strong'); valueEl.textContent = value;
      item.append(labelEl, valueEl); details.append(item);
    });
    confirmationDialog.showModal();
    setBodyDialogState();
  });
  $('#print-ticket').addEventListener('click', () => window.print());

  // Contact form does not transmit or save data; it only validates and acknowledges the demo.
  $('#contact-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String($('input[name="email"]', form).value).trim();
    const note = String($('textarea[name="message"]', form).value).trim();
    const message = $('#contact-message');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { message.textContent = 'Please enter a valid email address.'; return; }
    if (note.length < 5) { message.textContent = 'Please write a short note (at least 5 characters).'; return; }
    message.textContent = 'Demo complete — your message was not sent or stored.';
    form.reset();
    notify('Demo only: no message was sent.');
  });

  // Escape closes open dialogs; native dialog also handles Escape.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setTimeout(setBodyDialogState, 0);
  });
})();
