'use strict';
const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');
const btn = document.getElementById('loginBtn');
const senhaGroup = document.getElementById('senhaGroup');
let passwordMode = false;

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('show');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.remove('show');
  const email = document.getElementById('email').value.trim().toLowerCase();
  const senha = document.getElementById('senha').value;
  if (!email) return showError('Informe o e-mail administrativo.');
  if (passwordMode && !senha) return showError('Informe sua senha.');

  btn.disabled = true;
  btn.textContent = passwordMode ? 'Entrando…' : 'Verificando…';
  try {
    const res = await fetch(passwordMode ? '/admin/api/login' : '/admin/api/primeiro-acesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      credentials: 'same-origin',
      body: JSON.stringify(passwordMode ? { email, senha } : { email })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      if (!passwordMode && res.status === 401) {
        passwordMode = true;
        senhaGroup.hidden = false;
        document.getElementById('senha').required = true;
        btn.textContent = 'Entrar';
        document.getElementById('senha').focus();
        showError('A senha desta conta já foi configurada. Informe sua senha para entrar.');
      } else {
        showError((data && data.error) || 'Não foi possível entrar. Tente novamente.');
      }
      return;
    }
    if (data.setupRequired) {
      window.location.href = '/admin/conta.html';
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    window.location.href = next && next.startsWith('/admin') ? next : '/admin/';
  } catch (_) {
    showError('Falha de conexão com o servidor. Tente novamente.');
  } finally {
    btn.disabled = false;
    if (btn.textContent !== 'Entrar') btn.textContent = passwordMode ? 'Entrar' : 'Continuar';
  }
});
