'use strict';
const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');
const btn = document.getElementById('loginBtn');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('show');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.remove('show');
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  if (!email || !senha) return showError('Informe e-mail e senha.');

  btn.disabled = true;
  btn.textContent = 'Entrando…';
  try {
    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, senha })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      showError((data && (data.error || (data.errors && Object.values(data.errors)[0]))) || 'Não foi possível entrar. Tente novamente.');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    window.location.href = next && next.startsWith('/admin') ? next : '/admin/';
  } catch (_) {
    showError('Falha de conexão com o servidor. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
