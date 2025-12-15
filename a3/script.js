const msg = document.getElementById('message');
const count = document.getElementById('count');
let clicks = 0, alt = false;

document.getElementById('changeBtn').onclick = () => {
  msg.classList.toggle('alt');
  alt = !alt;
  msg.textContent = alt ? 'Alternate message!' : 'Hello, world!';
  count.textContent = ++clicks;
};

document.getElementById('applyBtn').onclick = () => {
  const val = document.getElementById('msgInput').value.trim();
  if (val) msg.textContent = val;
};

document.getElementById('themeToggle').onclick = () => {
  document.body.classList.toggle('theme-dark');
};
