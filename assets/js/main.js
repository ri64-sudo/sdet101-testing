// Mobile menu toggle and accessibility
(function(){
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  function setExpanded(val){
    if(!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(val));
    menu.classList.toggle('open', val);
  }
  toggle && toggle.addEventListener('click', ()=>{
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    setExpanded(!expanded);
  });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') setExpanded(false); });
})();

// Active link highlighting
(function(){
  const links = document.querySelectorAll('.menu a');
  const path = location.pathname.split('/').pop() || 'index.html';
  links.forEach(a=>{ if(a.getAttribute('href') === path) a.classList.add('active'); });
})();

// Smooth scroll for same-page anchors
(function(){
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('a[href^="#"]');
    if(!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth'}); }
  });
})();

// Footer year
(function(){
  const y = document.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();
})();

// Contact form validation (basic)
(function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(input, message){
    const field = input.closest('.field');
    const err = field?.querySelector('.error');
    if(err) err.textContent = message || '';
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    const message = form.querySelector('#message');
    let ok = true;

    if(!name.value.trim()){ setError(name, 'Please enter your name'); ok = false; } else setError(name, '');
    if(!emailPattern.test(email.value.trim())){ setError(email, 'Enter a valid email'); ok = false; } else setError(email, '');
    if(!message.value.trim()){ setError(message, 'Please write a message'); ok = false; } else setError(message, '');

    if(ok){
      const mailto = `mailto:you@example.com?subject=${encodeURIComponent('Website contact from '+name.value)}&body=${encodeURIComponent(message.value + '\n\nFrom: ' + email.value)}`;
      window.location.href = mailto;
      form.reset();
    }
  });
})();

// Carousel logic
(function(){
  const viewport = document.querySelector('.carousel-viewport');
  const track = document.querySelector('.carousel-track');
  if(!viewport || !track) return;
  const slides = Array.from(track.children);
  const btnPrev = document.querySelector('[data-carousel-prev]');
  const btnNext = document.querySelector('[data-carousel-next]');
  const dotsWrap = document.querySelector('.carousel-dots');
  const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('button')) : [];
  let index = 0;

  function setIndex(i){
    index = (i + slides.length) % slides.length;
    const offset = -index * viewport.clientWidth;
    track.style.transform = `translateX(${offset}px)`;
    dots.forEach((d,di)=> d.setAttribute('aria-selected', di===index ? 'true' : 'false'));
    viewport.setAttribute('aria-label', `${index+1} of ${slides.length}`);
  }

  function next(){ setIndex(index+1); }
  function prev(){ setIndex(index-1); }

  btnNext && btnNext.addEventListener('click', next);
  btnPrev && btnPrev.addEventListener('click', prev);
  dots.forEach((d,di)=> d.addEventListener('click', ()=> setIndex(di)) );

  // Keyboard support
  viewport.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') next();
    if(e.key === 'ArrowLeft') prev();
  });

  // Resize handling
  window.addEventListener('resize', ()=> setIndex(index));

  // Auto-advance (pause on reduced motion)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let intervalId = null;
  function start(){ if(!reduce.matches){ intervalId = setInterval(next, 5000); } }
  function stop(){ if(intervalId) clearInterval(intervalId); }
  viewport.addEventListener('mouseenter', stop);
  viewport.addEventListener('mouseleave', start);
  reduce.addEventListener?.('change', ()=>{ stop(); start(); });

  setIndex(0);
  start();
})();


