const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
const loginView = document.getElementById('loginView');
const dashboard = document.getElementById('dashboard');
const businessDashboard = document.getElementById('businessDashboard');
const businessSlug = new URLSearchParams(window.location.search).get('business');
let currentBusiness = null;

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `admin-message ${type}`;
}

function showView(authenticated) {
  loginView.style.display = authenticated ? 'none' : 'block';
  dashboard.style.display = 'none';
  businessDashboard.style.display = 'none';
}

async function loadBusinessDashboard(user, isPlatformOwner = false) {
  if (!businessSlug) return false;
  const { data: business, error: businessError } = await supabaseClient
    .from('businesses')
    .select('id, name, slug')
    .eq('slug', businessSlug)
    .maybeSingle();
  if (businessError || !business) throw new Error('No se encontró ese negocio');

  const { data: membership, error: membershipError } = await supabaseClient
    .from('business_members')
    .select('role')
    .eq('business_id', business.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!isPlatformOwner && (membershipError || !membership)) throw new Error('No tenés acceso a este negocio');

  const { data: hours, error: hoursError } = await supabaseClient
    .from('business_hours')
    .select('weekday, start_time, end_time, slot_minutes, active')
    .eq('business_id', business.id)
    .order('weekday');
  if (hoursError) throw hoursError;

  currentBusiness = business;
  document.getElementById('businessTitle').textContent = business.name;
  const byDay = Object.fromEntries((hours || []).map((row) => [row.weekday, row]));
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  document.getElementById('hoursRows').innerHTML = days.map((day, weekday) => {
    const row = byDay[weekday] || { start_time: '14:00', end_time: '17:00', slot_minutes: 60, active: false };
    return `<label style="grid-template-columns: 1.2fr 1fr 1fr auto; align-items:center; gap:.5rem; font-weight:500;">
      <span>${day}</span><input type="time" data-start="${weekday}" value="${row.start_time.slice(0, 5)}">
      <input type="time" data-end="${weekday}" value="${row.end_time.slice(0, 5)}">
      <input type="checkbox" data-active="${weekday}" ${row.active ? 'checked' : ''} aria-label="${day} activo">
    </label>`;
  }).join('');
  businessDashboard.style.display = 'block';
  return true;
}

async function refreshSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) return showView(false);
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles').select('role').eq('id', data.session.user.id).single();
    if (error) throw error;
    showView(true);
    if (profile.role === 'platform_owner' && !businessSlug) {
      dashboard.style.display = 'block';
    } else {
      await loadBusinessDashboard(data.session.user, profile.role === 'platform_owner');
    }
  } catch (error) {
    await supabaseClient.auth.signOut();
    showMessage(document.getElementById('loginMessage'), error.message, 'error');
    showView(false);
  }
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
  await refreshSession();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showView(false);
});
document.getElementById('businessLogoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showView(false);
});

document.getElementById('hoursForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = document.getElementById('hoursMessage');
  const button = event.target.querySelector('button');
  button.disabled = true;
  const rows = [...document.querySelectorAll('#hoursRows label')].map((row, weekday) => ({
    business_id: currentBusiness.id,
    weekday,
    start_time: row.querySelector('[data-start]').value,
    end_time: row.querySelector('[data-end]').value,
    slot_minutes: 60,
    active: row.querySelector('[data-active]').checked,
  }));
  const { error } = await supabaseClient.from('business_hours').upsert(rows, { onConflict: 'business_id,weekday' });
  button.disabled = false;
  showMessage(message, error ? error.message : 'Horarios guardados correctamente.', error ? 'error' : 'success');
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
