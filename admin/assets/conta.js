'use strict';
const form = document.getElementById('senhaForm');
const btn = document.getElementById('senhaBtn');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const atual = document.getElementById('senhaAtual').value;
  const nova = document.getElementById('senhaNova').value;
  const confirma = document.getElementById('senhaConfirma').value;
  if (nova !== confirma) return toast('A confirmação não corresponde à nova senha.', 'err');
  btn.disabled = true;
  const { data } = await api('/admin/api/senha', { method: 'POST', body: { atual, nova } });
  btn.disabled = false;
  if (data && data.ok) {
    toast('Senha definida com sucesso. Liberando o painel…', 'ok');
    form.reset();
    window.location.href = '/admin/';
  } else {
    toast((data && data.error) || 'Não foi possível alterar a senha.', 'err');
  }
});
