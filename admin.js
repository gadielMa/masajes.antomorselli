const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
const loginView = document.getElementById('loginView');
const dashboard = document.getElementById('dashboard');

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `admin-message ${type}`;
}

function showView(authenticated) {
  loginView.style.display = authenticated ? 'none' : 'block';
  dashboard.style.display = authenticated ? 'block' : 'none';
}

async function refreshSession() {
  const { data } = await supabaseClient.auth.getSession();
  showView(Boolean(data.session));
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = document.getElementById('loginMessage');
  const button = event.target.querySelector('button');
  button.disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById('loginEmail').value.trim(),
    password: document.getElementById('loginPassword').value,
  });
  button.disabled = false;
  if (error) return showMessage(message, error.message, 'error');
  showView(true);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showView(false);
});

document.getElementById('createForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button');
  const message = document.getElementById('createMessage');
  button.disabled = true;
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const response = await fetch(`${supabaseFunctionUrl('create-business-admin')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_CONFIG.ANON_KEY,
      'Authorization': `Bearer ${sessionData.session?.access_token || ''}`,
    },
    body: JSON.stringify({
      full_name: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      business_name: document.getElementById('businessName').value.trim(),
      slug: document.getElementById('slug').value.trim().toLowerCase(),
    }),
  });
  const result = await response.json().catch(() => ({}));
  button.disabled = false;
  if (!response.ok) return showMessage(message, result.error || 'No se pudo crear la cuenta', 'error');
  showMessage(message, `Cuenta creada para ${result.admin.email}. Negocio: ${result.business.slug}`, 'success');
  form.reset();
});

refreshSession();
