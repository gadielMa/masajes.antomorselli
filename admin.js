const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
const loginView = document.getElementById('loginView');
const dashboard = document.getElementById('dashboard');
const businessDashboard = document.getElementById('businessDashboard');
const businessSlug = new URLSearchParams(window.location.search).get('business');
let currentBusiness = null;
let scheduleCalendar = null;
let scheduleRules = [];
let editingRuleIndex = null;

function showMessage(element, message, type) { element.textContent = message; element.className = `admin-message ${type}`; }
function showView(authenticated) { loginView.style.display = authenticated ? 'none' : 'block'; dashboard.style.display = 'none'; businessDashboard.style.display = 'none'; }
function dateOnly(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function parseDate(value) { return new Date(`${value}T12:00:00`); }
function addDays(date, days) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function dateDiff(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); }
function dateRangeDates(start, end) { const dates = []; for (let date = new Date(start); date < end; date = addDays(date, 1)) dates.push(new Date(date)); return dates; }

function ruleApplies(rule, date) {
  const value = dateOnly(date);
  if (!rule.active || value < rule.start_date || (rule.until_date && value > rule.until_date)) return false;
  const days = dateDiff(value, rule.start_date);
  if (rule.frequency === 'once') return value === rule.start_date;
  if (rule.frequency === 'weekly') return rule.weekdays.includes(parseDate(value).getDay()) && Math.floor(days / 7) % rule.interval_count === 0;
  const start = parseDate(rule.start_date);
  const current = parseDate(value);
  const months = (current.getFullYear() - start.getFullYear()) * 12 + current.getMonth() - start.getMonth();
  return current.getDate() === start.getDate() && months >= 0 && months % rule.interval_count === 0;
}

function eventDataForRange(start, end) {
  return scheduleRules.flatMap((rule, index) => dateRangeDates(start, end).filter((date) => ruleApplies(rule, date)).map((date) => ({
    id: `${rule.id || 'new'}-${dateOnly(date)}`,
    title: rule.title || 'Disponible',
    start: `${dateOnly(date)}T${rule.start_time.slice(0, 5)}:00`,
    end: `${dateOnly(date)}T${rule.end_time.slice(0, 5)}:00`,
    extendedProps: { ruleIndex: index },
  })));
}

function refreshCalendar() { if (scheduleCalendar) scheduleCalendar.refetchEvents(); }

function openScheduleModal({ ruleIndex = null, date, start = '14:00', end = '15:00' }) {
  editingRuleIndex = ruleIndex;
  const rule = ruleIndex === null ? null : scheduleRules[ruleIndex];
  document.getElementById('scheduleModalTitle').textContent = rule ? 'Editar horario' : 'Nuevo horario';
  document.getElementById('scheduleDate').value = rule?.start_date || date;
  document.getElementById('scheduleStart').value = (rule?.start_time || start).slice(0, 5);
  document.getElementById('scheduleEnd').value = (rule?.end_time || end).slice(0, 5);
  document.getElementById('scheduleFrequency').value = rule?.frequency || 'once';
  document.getElementById('scheduleInterval').value = rule?.interval_count || 1;
  document.getElementById('scheduleOccurrences').value = rule?.occurrences || '';
  document.getElementById('scheduleUntil').value = rule?.until_date || '';
  document.getElementById('scheduleDelete').style.display = rule ? 'inline-block' : 'none';
  document.getElementById('scheduleModal').classList.add('open');
}

function closeScheduleModal() { document.getElementById('scheduleModal').classList.remove('open'); editingRuleIndex = null; }

async function loadBusinessDashboard(user, isPlatformOwner = false) {
  if (!businessSlug) return false;
  const { data: business, error: businessError } = await supabaseClient.from('businesses').select('id, name, slug').eq('slug', businessSlug).maybeSingle();
  if (businessError || !business) throw new Error('No se encontró ese negocio');
  const { data: membership, error: membershipError } = await supabaseClient.from('business_members').select('role').eq('business_id', business.id).eq('user_id', user.id).maybeSingle();
  if (!isPlatformOwner && (membershipError || !membership)) throw new Error('No tenés acceso a este negocio');

  currentBusiness = business;
  document.getElementById('businessTitle').textContent = business.name;
  let { data: rules, error: rulesError } = await supabaseClient.from('availability_rules').select('*').eq('business_id', business.id).order('start_date');
  if (rulesError) throw rulesError;
  scheduleRules = rules || [];
  scheduleCalendar?.destroy();
  scheduleCalendar = new FullCalendar.Calendar(document.getElementById('hoursCalendar'), {
    initialView: 'timeGridWeek', initialDate: new Date(), locale: 'es', firstDay: 1, allDaySlot: false,
    slotMinTime: '06:00:00', slotMaxTime: '23:00:00', slotDuration: '00:30:00', height: 'auto', editable: true, selectable: true,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' },
    events: (info, success) => success(eventDataForRange(info.start, info.end)),
    select: (info) => openScheduleModal({ date: dateOnly(info.start), start: info.startStr.slice(11, 16), end: info.endStr.slice(11, 16) }),
    eventClick: (info) => openScheduleModal({ ruleIndex: info.event.extendedProps.ruleIndex, date: dateOnly(info.event.start), start: info.event.start.toTimeString(), end: info.event.end.toTimeString() }),
    eventChange: (info) => {
      const index = info.event.extendedProps.ruleIndex;
      if (index === undefined || !info.event.start || !info.event.end) return;
      const rule = scheduleRules[index];
      rule.start_date = dateOnly(info.event.start);
      rule.start_time = info.event.start.toTimeString().slice(0, 8);
      rule.end_time = info.event.end.toTimeString().slice(0, 8);
      if (rule.frequency === 'weekly') rule.weekdays = [info.event.start.getDay()];
    },
  });
  scheduleCalendar.render();
  businessDashboard.style.display = 'block';
  return true;
}

async function refreshSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) return showView(false);
  try {
    const { data: profile, error } = await supabaseClient.from('profiles').select('role').eq('id', data.session.user.id).single();
    if (error) throw error;
    showView(true);
    if (profile.role === 'platform_owner' && !businessSlug) dashboard.style.display = 'block';
    else await loadBusinessDashboard(data.session.user, profile.role === 'platform_owner');
  } catch (error) { await supabaseClient.auth.signOut(); showMessage(document.getElementById('loginMessage'), error.message, 'error'); showView(false); }
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({ email: document.getElementById('loginEmail').value.trim(), password: document.getElementById('loginPassword').value });
  button.disabled = false; if (error) return showMessage(document.getElementById('loginMessage'), error.message, 'error'); await refreshSession();
});
for (const id of ['logoutBtn', 'businessLogoutBtn']) document.getElementById(id).addEventListener('click', async () => { await supabaseClient.auth.signOut(); showView(false); });

document.getElementById('scheduleCancel').addEventListener('click', closeScheduleModal);
document.getElementById('scheduleDelete').addEventListener('click', () => { if (editingRuleIndex !== null && confirm('¿Querés eliminar este horario?')) { scheduleRules.splice(editingRuleIndex, 1); closeScheduleModal(); refreshCalendar(); } });
document.getElementById('scheduleForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const date = document.getElementById('scheduleDate').value;
  const frequency = document.getElementById('scheduleFrequency').value;
  const rule = { ...(editingRuleIndex === null ? {} : scheduleRules[editingRuleIndex]), business_id: currentBusiness.id, title: 'Disponible', start_date: date, start_time: `${document.getElementById('scheduleStart').value}:00`, end_time: `${document.getElementById('scheduleEnd').value}:00`, frequency, interval_count: Number(document.getElementById('scheduleInterval').value) || 1, occurrences: Number(document.getElementById('scheduleOccurrences').value) || null, until_date: document.getElementById('scheduleUntil').value || null, weekdays: frequency === 'weekly' ? [parseDate(date).getDay()] : [], active: true };
  if (rule.start_time >= rule.end_time) return alert('La hora de inicio debe ser anterior a la hora de fin.');
  if (editingRuleIndex === null) scheduleRules.push(rule); else scheduleRules[editingRuleIndex] = rule;
  closeScheduleModal(); refreshCalendar();
});

document.getElementById('hoursForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const button = event.target.querySelector('button'); const message = document.getElementById('hoursMessage'); button.disabled = true;
  await supabaseClient.from('availability_rules').delete().eq('business_id', currentBusiness.id);
  const payload = scheduleRules.map(({ id, created_at, updated_at, ...rule }) => rule);
  const { error } = payload.length ? await supabaseClient.from('availability_rules').insert(payload) : { error: null };
  button.disabled = false; showMessage(message, error ? error.message : 'Horarios guardados correctamente.', error ? 'error' : 'success');
  if (!error) await loadBusinessDashboard((await supabaseClient.auth.getUser()).data.user);
});

document.getElementById('createForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.target; const button = form.querySelector('button'); const message = document.getElementById('createMessage'); button.disabled = true;
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const response = await fetch(supabaseFunctionUrl('create-business-admin'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_CONFIG.ANON_KEY, 'Authorization': `Bearer ${sessionData.session?.access_token || ''}` }, body: JSON.stringify({ full_name: document.getElementById('fullName').value.trim(), email: document.getElementById('email').value.trim(), password: document.getElementById('password').value, business_name: document.getElementById('businessName').value.trim(), slug: document.getElementById('slug').value.trim().toLowerCase() }) });
  const result = await response.json().catch(() => ({})); button.disabled = false; if (!response.ok) return showMessage(message, result.error || 'No se pudo crear la cuenta', 'error'); showMessage(message, `Cuenta creada para ${result.admin.email}. Negocio: ${result.business.slug}`, 'success'); form.reset();
});

refreshSession();
