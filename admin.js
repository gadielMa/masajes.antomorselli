const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
const loginView = document.getElementById('loginView');
const dashboard = document.getElementById('dashboard');
const businessDashboard = document.getElementById('businessDashboard');
const businessSlug = new URLSearchParams(window.location.search).get('business');
let currentBusiness = null;
let scheduleCalendar = null;
let appointmentsCalendar = null;
let scheduleRules = [];
let editingRuleIndex = null;
let editingClientId = null;
let pendingClientDeleteId = null;
const earlyHoursVisible = { appointments: false, schedule: false };
const ARGENTINA_HOLIDAYS_2026 = {
  '2026-01-01': 'Año Nuevo', '2026-02-16': 'Carnaval', '2026-02-17': 'Carnaval',
  '2026-03-23': 'Feriado turístico', '2026-03-24': 'Día Nacional de la Memoria',
  '2026-04-02': 'Día del Veterano y de los Caídos en Malvinas', '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo', '2026-05-25': 'Revolución de Mayo', '2026-06-15': 'Paso a la Inmortalidad de Güemes',
  '2026-06-20': 'Paso a la Inmortalidad de Belgrano', '2026-07-09': 'Día de la Independencia', '2026-07-10': 'Feriado turístico',
  '2026-08-17': 'Paso a la Inmortalidad de San Martín', '2026-10-12': 'Día del Respeto a la Diversidad Cultural',
  '2026-11-23': 'Día de la Soberanía Nacional', '2026-12-07': 'Feriado turístico', '2026-12-08': 'Inmaculada Concepción', '2026-12-25': 'Navidad',
};
function argentinaHoliday(date) { return ARGENTINA_HOLIDAYS_2026[dateOnly(date)] || null; }

function showMessage(element, message, type) { element.textContent = message; element.className = `admin-message ${type}`; }
function showView(authenticated) { loginView.style.display = authenticated ? 'none' : 'block'; dashboard.style.display = 'none'; businessDashboard.style.display = 'none'; document.getElementById('clientsPanel').classList.remove('active'); }
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

async function loadAppointmentsCalendar() {
  const { data: bookings, error } = await supabaseClient
    .from('bookings')
    .select('id, name, service, booking_date, booking_time, status, payment_method')
    .eq('business_id', currentBusiness.id)
    .in('status', ['pending', 'confirmed', 'cancelled'])
    .order('booking_date').order('booking_time');
  if (error) throw error;

  const serviceNames = { descontracturante: 'Descontracturante', relajante: 'Relajante', deportivo: 'Deportivo' };
  const events = (bookings || []).map((booking) => {
    const start = `${booking.booking_date}T${booking.booking_time.slice(0, 8)}`;
    const end = new Date(`${start}-03:00`);
    end.setMinutes(end.getMinutes() + 60);
    const paid = booking.payment_method === 'mercadopago' && booking.status === 'confirmed';
    const cash = booking.payment_method === 'cash';
    const color = paid ? '#2e9d58' : cash ? '#d84a4a' : '#d49b2a';
    return { id: `booking-${booking.id}`, title: `${booking.name} · ${serviceNames[booking.service] || booking.service}`, start, end: end.toISOString(), backgroundColor: color, borderColor: color, extendedProps: { booking } };
  });

  appointmentsCalendar?.destroy();
  appointmentsCalendar = new FullCalendar.Calendar(document.getElementById('appointmentsCalendar'), {
    initialView: 'timeGridWeek', initialDate: new Date(), locale: 'es', firstDay: 1, allDaySlot: false,
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' },
    slotMinTime: '06:00:00', slotMaxTime: '24:00:00', slotDuration: '00:15:00', slotLabelInterval: '01:00:00', height: 'auto',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }, events,
    eventClick: (info) => { const booking = info.event.extendedProps.booking; alert(`${booking.name}\n${serviceNames[booking.service] || booking.service}\n${booking.booking_date} ${booking.booking_time.slice(0, 5)}\nEstado: ${booking.status === 'confirmed' ? 'Confirmado' : booking.status}`); },
  });
  appointmentsCalendar.render();
}

async function loadClients() {
  const { data, error } = await supabaseClient.from('clients').select('id, name, dni').eq('business_id', currentBusiness.id).order('name');
  if (error) throw error;
  const list = document.getElementById('clientsList');
  list.replaceChildren();
  (data || []).forEach((client) => {
    const row = document.createElement('tr');
    const name = document.createElement('td'); name.textContent = client.name;
    const dni = document.createElement('td'); dni.textContent = client.dni;
    const actions = document.createElement('td'); actions.className = 'client-actions';
    const edit = document.createElement('button'); edit.className = 'client-action client-edit'; edit.dataset.action = 'edit'; edit.dataset.id = client.id; edit.dataset.name = client.name; edit.dataset.dni = client.dni; edit.textContent = 'Editar';
    const remove = document.createElement('button'); remove.className = 'client-action client-delete'; remove.dataset.action = 'delete'; remove.dataset.id = client.id; remove.dataset.name = client.name; remove.dataset.dni = client.dni; remove.textContent = 'Eliminar';
    actions.append(edit, remove); row.append(name, dni, actions); list.appendChild(row);
  });
}

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
  businessDashboard.style.display = 'block';
  let { data: rules, error: rulesError } = await supabaseClient.from('availability_rules').select('*').eq('business_id', business.id).order('start_date');
  if (rulesError) throw rulesError;
  scheduleRules = rules || [];
  scheduleCalendar?.destroy();
  scheduleCalendar = new FullCalendar.Calendar(document.getElementById('hoursCalendar'), {
    initialView: 'timeGridWeek', initialDate: new Date(), locale: 'es', firstDay: 1, allDaySlot: false,
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' },
    slotMinTime: '06:00:00', slotMaxTime: '24:00:00', slotDuration: '00:15:00', snapDuration: '00:15:00', slotLabelInterval: '01:00:00', height: 'auto', editable: true, selectable: true,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' },
    events: (info, success) => success(eventDataForRange(info.start, info.end)),
    dayCellClassNames: (info) => {
      const classes = [];
      if (info.date.getDay() === 0) classes.push('sunday-cell');
      if (argentinaHoliday(info.date)) classes.push('argentina-holiday');
      return classes;
    },
    selectAllow: (info) => !argentinaHoliday(info.start) && info.start.getDay() !== 0,
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
  await loadAppointmentsCalendar();
  await loadClients();
  requestAnimationFrame(() => {
    scheduleCalendar?.updateSize();
    appointmentsCalendar?.updateSize();
  });
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

document.getElementById('appointmentsTab').addEventListener('click', () => {
  document.getElementById('appointmentsTab').classList.add('active'); document.getElementById('scheduleTab').classList.remove('active');
  document.getElementById('clientsTab').classList.remove('active'); document.getElementById('appointmentsPanel').classList.add('active'); document.getElementById('schedulePanel').classList.remove('active'); document.getElementById('clientsPanel').classList.remove('active');
  appointmentsCalendar?.updateSize();
});
document.getElementById('scheduleTab').addEventListener('click', () => {
  document.getElementById('scheduleTab').classList.add('active'); document.getElementById('appointmentsTab').classList.remove('active'); document.getElementById('clientsTab').classList.remove('active');
  document.getElementById('schedulePanel').classList.add('active'); document.getElementById('appointmentsPanel').classList.remove('active'); document.getElementById('clientsPanel').classList.remove('active');
  scheduleCalendar?.updateSize();
});
document.getElementById('clientsTab').addEventListener('click', () => {
  document.getElementById('clientsTab').classList.add('active'); document.getElementById('appointmentsTab').classList.remove('active'); document.getElementById('scheduleTab').classList.remove('active');
  document.getElementById('clientsPanel').classList.add('active'); document.getElementById('appointmentsPanel').classList.remove('active'); document.getElementById('schedulePanel').classList.remove('active');
});

document.getElementById('clientForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('clientName').value.trim();
  const dni = document.getElementById('clientDni').value.trim();
  const message = document.getElementById('clientsMessage');
  if (!/^\d{7,8}$/.test(dni)) return showMessage(message, 'El DNI debe tener 7 u 8 dígitos.', 'error');
  const { error } = await supabaseClient.from('clients').upsert({ business_id: currentBusiness.id, name, dni }, { onConflict: 'business_id,dni' });
  if (error) return showMessage(message, error.message, 'error');
  showMessage(message, 'Cliente guardado correctamente.', 'success');
  event.target.reset();
  await loadClients();
});

function closeClientConfirm() { document.getElementById('clientConfirmModal').classList.remove('open'); pendingClientDeleteId = null; }
function showClientNotice(title, text) {
  document.getElementById('clientConfirmTitle').textContent = title;
  document.getElementById('clientConfirmText').textContent = text;
  document.getElementById('clientConfirmAccept').style.display = 'none';
  document.getElementById('clientConfirmCancel').textContent = 'Entendido';
  document.getElementById('clientConfirmModal').classList.add('open');
}
function showClientDeleteConfirm(id, name) {
  pendingClientDeleteId = id;
  document.getElementById('clientConfirmTitle').textContent = 'Eliminar cliente';
  document.getElementById('clientConfirmText').textContent = `¿Querés eliminar a ${name} de la lista? Sus reservas no se borrarán.`;
  document.getElementById('clientConfirmAccept').style.display = 'inline-block';
  document.getElementById('clientConfirmCancel').textContent = 'Cancelar';
  document.getElementById('clientConfirmModal').classList.add('open');
}

document.getElementById('clientConfirmCancel').addEventListener('click', closeClientConfirm);
document.getElementById('clientConfirmAccept').addEventListener('click', async () => {
  if (!pendingClientDeleteId) return;
  const { error } = await supabaseClient.from('clients').delete().eq('id', pendingClientDeleteId).eq('business_id', currentBusiness.id);
  closeClientConfirm();
  if (error) return showMessage(document.getElementById('clientsMessage'), error.message, 'error');
  await loadClients();
});

document.getElementById('clientsList').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === 'delete') {
    const { data: bookings, error } = await supabaseClient.from('bookings').select('id').eq('business_id', currentBusiness.id).eq('dni', button.dataset.dni).limit(1);
    if (error) return showMessage(document.getElementById('clientsMessage'), error.message, 'error');
    if (bookings?.length) return showClientNotice('Cliente con reservas', 'No se puede eliminar este cliente porque tiene turnos asociados. Las reservas deben seguir siendo consultables por DNI.');
    return showClientDeleteConfirm(id, button.dataset.name);
  } else {
    editingClientId = id;
    document.getElementById('editClientName').value = button.dataset.name;
    document.getElementById('editClientDni').value = button.dataset.dni;
    const { data: bookings } = await supabaseClient.from('bookings').select('id').eq('business_id', currentBusiness.id).eq('dni', button.dataset.dni).limit(1);
    const hasBookings = Boolean(bookings?.length);
    document.getElementById('editClientDni').readOnly = hasBookings;
    document.getElementById('editClientNotice').style.display = hasBookings ? 'block' : 'none';
    document.getElementById('editClientNotice').textContent = hasBookings ? 'Este cliente tiene reservas: el DNI no se puede modificar.' : '';
    document.getElementById('clientEditModal').classList.add('open');
  }
});

document.getElementById('clientEditCancel').addEventListener('click', () => { document.getElementById('clientEditModal').classList.remove('open'); editingClientId = null; });
document.getElementById('clientEditForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { error } = await supabaseClient.from('clients').update({ name: document.getElementById('editClientName').value.trim(), dni: document.getElementById('editClientDni').value.trim() }).eq('id', editingClientId).eq('business_id', currentBusiness.id);
  if (error) return showMessage(document.getElementById('clientsMessage'), error.message, 'error');
  document.getElementById('clientEditModal').classList.remove('open'); editingClientId = null; await loadClients();
});

function toggleEarlyHours(kind, calendar, button) {
  earlyHoursVisible[kind] = !earlyHoursVisible[kind];
  calendar?.setOption('slotMinTime', earlyHoursVisible[kind] ? '00:00:00' : '06:00:00');
  button.textContent = earlyHoursVisible[kind] ? 'Ocultar 00:00–06:00' : 'Mostrar 00:00–06:00';
}
document.getElementById('appointmentsEarlyHours').addEventListener('click', (event) => toggleEarlyHours('appointments', appointmentsCalendar, event.currentTarget));
document.getElementById('scheduleEarlyHours').addEventListener('click', (event) => toggleEarlyHours('schedule', scheduleCalendar, event.currentTarget));

document.getElementById('cashBookingButton').addEventListener('click', () => {
  document.getElementById('cashDate').value = dateOnly(new Date());
  document.getElementById('cashTime').value = '14:00';
  document.getElementById('cashModal').classList.add('open');
});
document.getElementById('cashCancel').addEventListener('click', () => document.getElementById('cashModal').classList.remove('open'));
document.getElementById('cashForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const date = document.getElementById('cashDate').value;
  const cashDni = document.getElementById('cashDni').value.trim();
  if (!/^\d{7,8}$/.test(cashDni)) return alert('El DNI debe tener 7 u 8 dígitos.');
  const { error } = await supabaseClient.from('bookings').insert({
    business_id: currentBusiness.id,
    name: document.getElementById('cashName').value.trim(),
    dni: cashDni,
    service: document.getElementById('cashService').value,
    booking_date: date,
    booking_time: `${document.getElementById('cashTime').value}:00`,
    status: 'confirmed',
    payment_method: document.getElementById('cashPaymentMethod').value,
  });
  if (error) return alert(error.code === '23505' ? 'Ese horario ya está ocupado.' : error.message);
  await supabaseClient.from('clients').upsert({ business_id: currentBusiness.id, name: document.getElementById('cashName').value.trim(), dni: cashDni }, { onConflict: 'business_id,dni' });
  document.getElementById('cashModal').classList.remove('open');
  document.getElementById('cashForm').reset();
  await loadAppointmentsCalendar();
});

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

function applyDarkMode(enabled) {
  document.body.classList.toggle('dark-mode', enabled);
  document.querySelectorAll('.dark-mode-toggle').forEach((button) => {
    button.textContent = enabled ? '☀' : '☾';
    button.setAttribute('aria-label', enabled ? 'Desactivar modo oscuro' : 'Activar modo oscuro');
  });
}
applyDarkMode(localStorage.getItem('adminDarkMode') === 'true');
document.querySelectorAll('.dark-mode-toggle').forEach((button) => button.addEventListener('click', () => {
  const enabled = !document.body.classList.contains('dark-mode');
  localStorage.setItem('adminDarkMode', String(enabled));
  applyDarkMode(enabled);
}));
