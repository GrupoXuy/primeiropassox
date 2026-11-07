'use strict';
const form = document.getElementById('setupForm');
const errorBox = document.getElementById('setupError');
const btn = document.getElementById('setupBtn');
const token = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
window.history.replaceState(null, '', window.location.pathname + window.location.search);
function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add('show');
}
if (!token) {
  showError('Link de primeiro acesso ausente. Solicite um novo link ao responsável pelo sistema.');
  btn.disabled = true;
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.classList.remove('show');
  const senha = document.getElementById('senha').value;
  const confirmar = document.getElementById('confirmar').value;
  if (senha !== confirmar) return showError('As senhas não coincidem.');
  if (senha.length < 6) {
    return showError('Use ao menos 6 caracteres.');
  }
  btn.disabled = true;
  btn.textContent = 'Salvando…';
  try {
    const response = await fetch('/admin/api/primeiro-acesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      credentials: 'same-origin',
      body: JSON.stringify({ token, senha })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.ok) {
      showError((data && data.error) || 'Não foi possível configurar sua senha. Solicite um novo link.');
      return;
    }
    window.location.replace('/admin/');
  } catch (_) {
    showError('Falha de conexão. Verifique sua internet e tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar senha e acessar';
  }
});