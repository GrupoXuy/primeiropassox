'use strict';
const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const queryParams = new URLSearchParams(window.location.search);
const email = (params.get('email') || queryParams.get('email') || 'primeiropassorecrutamento@gmail.com').toLowerCase();
const token = params.get('token') || '';
const requestForm = document.getElementById('requestSetupForm');
const setForm = document.getElementById('setPasswordForm');
const requestError = document.getElementById('requestError');
const passwordError = document.getElementById('passwordError');
const show = (el, msg) => { el.textContent = msg; el.classList.add('show'); };
if (email === 'primeiropassorecrutamento@gmail.com') document.getElementById('setupEmail').value = email;
if (token) {
  requestForm.hidden = true; setForm.hidden = false;
  document.getElementById('setupIntro').textContent = 'Defina uma senha forte para proteger o painel de recrutamento.';
}
requestForm.addEventListener('submit', async (e) => {
  e.preventDefault(); requestError.classList.remove('show');
  const btn = document.getElementById('requestBtn'); btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const res = await fetch('/admin/api/primeiro-acesso/solicitar', { method:'POST', headers:{'Content-Type':'application/json','X-Requested-With':'fetch'}, credentials:'same-origin', body:JSON.stringify({email}) });
    const data = await res.json().catch(()=>null);
    if (!res.ok || !data || !data.ok) throw new Error((data && data.error) || 'Não foi possível enviar o link.');
    document.getElementById('setupIntro').textContent = 'Se o endereço estiver autorizado, enviaremos um link para criar a senha. Verifique sua caixa de entrada e a pasta de spam.';
    requestForm.hidden = true;
  } catch (err) { show(requestError, err.message || 'Falha de conexão.'); }
  finally { btn.disabled = false; btn.textContent = 'Enviar link de primeiro acesso'; }
});
setForm.addEventListener('submit', async (e) => {
  e.preventDefault(); passwordError.classList.remove('show');
  const senha = document.getElementById('newPassword').value;
  const confirmacao = document.getElementById('confirmPassword').value;
  if (senha.length < 10 || !/[a-z]/.test(senha) || !/[A-Z]/.test(senha) || !/[0-9]/.test(senha)) return show(passwordError, 'Use ao menos 10 caracteres, com maiúscula, minúscula e número.');
  if (senha !== confirmacao) return show(passwordError, 'As senhas não coincidem.');
  const btn = document.getElementById('passwordBtn'); btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const res = await fetch('/admin/api/primeiro-acesso/concluir', { method:'POST', headers:{'Content-Type':'application/json','X-Requested-With':'fetch'}, credentials:'same-origin', body:JSON.stringify({email,token,senha}) });
    const data = await res.json().catch(()=>null);
    if (!res.ok || !data || !data.ok) throw new Error((data && data.error) || 'Não foi possível criar a senha.');
    document.getElementById('setupTitle').textContent = 'Senha criada com sucesso';
    document.getElementById('setupIntro').textContent = 'Agora você pode entrar na área administrativa.';
    setForm.hidden = true;
    const link = document.createElement('a'); link.className='adm-btn solid'; link.href='/admin/login.html'; link.textContent='Ir para o login'; link.style.marginTop='1rem'; link.style.display='inline-flex';
    document.querySelector('.login-card').appendChild(link);
  } catch (err) { show(passwordError, err.message || 'Falha de conexão.'); }
  finally { btn.disabled = false; btn.textContent = 'Criar senha'; }
});