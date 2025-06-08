const appState = {
  users: [],
  currentUser: null,
  events: [],
  rsvps: {},
  checkins: {},
};

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const dashboardPage = document.getElementById("dashboard-page");
const loginPage = document.getElementById("login-page");
const signupPage = document.getElementById("signup-page");
const eventForm = document.getElementById("event-form");
const eventList = document.getElementById("event-list");
const calendarView = document.getElementById("calendar-view");
const logoutBtn = document.getElementById("logout-button");
const rsvpBtn = document.getElementById("rsvp-button");
const checkinBtn = document.getElementById("checkin-button");
const commentForm = document.getElementById("comment-form");
const emojiBtns = document.querySelectorAll(".emoji-btn");
const checkinScreen = document.getElementById("checkin-screen");
const confirmCheckin = document.getElementById("confirm-checkin");
const cancelCheckin = document.getElementById("cancel-checkin");
const checkinEventTitle = document.getElementById("checkin-event-title");
let attendanceChart;

function showPage(pageId) {
  loginPage.style.display = 'none';
  signupPage.style.display = 'none';
  dashboardPage.style.display = 'none';
  checkinScreen.style.display = 'none';
  document.getElementById(pageId).style.display = 'block';
}

function renderCalendar(events) {
  calendarView.innerHTML = "";
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(today.getFullYear(), today.getMonth(), day);
    const event = events.find(e => {
      const eventDate = new Date(e.date);
      return eventDate.getFullYear() === dayDate.getFullYear() &&
             eventDate.getMonth() === dayDate.getMonth() &&
             eventDate.getDate() === day;
    });
    const div = document.createElement("div");
    div.className = "calendar-day" + (event ? " event" : "");
    div.innerHTML = `<span>${day}</span>`;
    if (event) {
      div.title = event.title;
      const isLive = new Date(event.date) <= today && today < new Date(event.deadline);
      if (isLive) {
        div.innerHTML += `<span class="live-badge blink">Live</span>`;
      }
      div.addEventListener("click", () => {
        if (appState.currentUser.role === 'host') {
          alert(`Event: ${event.title}\nTopics: ${event.topics || 'None'}`);
        } else {
          alert(`Event: ${event.title}\nDescription: ${event.description}`);
        }
      });
    }
    calendarView.appendChild(div);
  }
}

function renderAttendanceChart() {
  const ctx = document.getElementById('attendance-chart').getContext('2d');
  if (attendanceChart) attendanceChart.destroy();
  const eventData = appState.events.map(event => ({
    label: event.title,
    attendees: (appState.rsvps[event.title] || []).length
  }));
  attendanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: eventData.map(d => d.label),
      datasets: [{
        label: 'Attendees',
        data: eventData.map(d => d.attendees),
        backgroundColor: '#3b82f6',
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Number of Attendees' } },
        x: { title: { display: true, text: 'Events' } }
      }
    }
  });
}

function sendMockEmail(type, event) {
  const user = appState.currentUser;
  switch (type) {
    case 'rsvp':
      alert(`Email sent to ${user.email}: You're confirmed for ${event.title}`);
      break;
    case 'checkin-reminder':
      alert(`Email sent to ${user.email}: Check-in now open for ${event.title}`);
      break;
    case 'post-event':
      alert(`Email sent to ${user.email}: Thanks for attending ${event.title}! View summary`);
      break;
  }
}

loginForm.onsubmit = (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const email = formData.get("email");
  const password = formData.get("password");
  const user = appState.users.find(u => u.email === email && u.password === password);
  if (user) {
    appState.currentUser = user;
    updateDashboard();
    showPage("dashboard-page");
  } else {
    alert("Invalid credentials");
  }
};

signupForm.onsubmit = (e) => {
  e.preventDefault();
  const formData = new FormData(signupForm);
  const newUser = Object.fromEntries(formData.entries());
  if (newUser.role === 'host' && newUser.hostCode !== 'host123') {
    return alert("Invalid host code");
  }
  appState.users.push(newUser);
  alert("Signup successful! Please login.");
  showPage("login-page");
};

eventForm.onsubmit = (e) => {
  e.preventDefault();
  const data = new FormData(eventForm);
  const eventObj = Object.fromEntries(data.entries());
  eventObj.host = appState.currentUser.name;
  eventObj.topics = eventObj.topics ? eventObj.topics.split(',').map(t => t.trim()) : [];
  appState.events.push(eventObj);
  eventForm.reset();
  renderCalendar(appState.events);
  renderEvents();
  if (appState.currentUser.role === 'host') renderAttendanceChart();
};

function updateDashboard() {
  const user = appState.currentUser;
  const isHost = user.role === 'host';
  document.querySelectorAll('.host-only').forEach(el => el.classList.toggle('hidden', !isHost));
  document.querySelectorAll('.attendee-only').forEach(el => el.classList.toggle('hidden', isHost));
  renderCalendar(appState.events);
  renderEvents();
  if (isHost) renderAttendanceChart();
  if (!isHost) {
    appState.events.forEach(event => {
      const eventDate = new Date(event.date);
      const now = new Date();
      if (appState.rsvps[event.title]?.includes(user.email)) {
        checkinBtn.classList.remove('hidden');
        if (now >= new Date(eventDate.getTime() - 3600 * 1000) && now < new Date(event.deadline)) {
          sendMockEmail('checkin-reminder', event);
        }
      }
    });
  }
}

function renderEvents() {
  eventList.innerHTML = "";
  appState.events.forEach(event => {
    const div = document.createElement("div");
    div.className = "border p-4 mb-2 bg-gray-100";
    const attendees = (appState.rsvps[event.title] || []).length;
    div.innerHTML = `
      <strong>${event.title}</strong><br>
      ${event.description}<br>
      ${new Date(event.date).toLocaleString()} - ${event.location}<br>
      Max Attendees: ${event.max} | Current: ${attendees}<br>
      ${appState.currentUser.role === 'host' ? `Topics: ${event.topics?.join(', ') || 'None'}` : ''}
    `;
    eventList.appendChild(div);
  });
}

logoutBtn.onclick = () => {
  appState.currentUser = null;
  showPage("login-page");
};

rsvpBtn.onclick = () => {
  const selectedEvent = appState.events[0]; // Mock: assume first event
  if (!appState.rsvps[selectedEvent.title]) appState.rsvps[selectedEvent.title] = [];
  if (!appState.rsvps[selectedEvent.title].includes(appState.currentUser.email)) {
    appState.rsvps[selectedEvent.title].push(appState.currentUser.email);
    sendMockEmail('rsvp', selectedEvent);
    updateDashboard();
  } else {
    alert("Already RSVP'd!");
  }
};

checkinBtn.onclick = () => {
  const selectedEvent = appState.events[0]; // Mock: assume first event
  checkinEventTitle.textContent = `Event: ${selectedEvent.title}`;
  showPage("checkin-screen");
};

confirmCheckin.onclick = () => {
  const selectedEvent = appState.events[0]; // Mock: assume first event
  if (!appState.checkins[selectedEvent.title]) appState.checkins[selectedEvent.title] = [];
  if (!appState.checkins[selectedEvent.title].includes(appState.currentUser.email)) {
    appState.checkins[selectedEvent.title].push(appState.currentUser.email);
    sendMockEmail('post-event', selectedEvent);
    showPage("dashboard-page");
    updateDashboard();
  } else {
    alert("Already checked in!");
  }
};

cancelCheckin.onclick = () => {
  showPage("dashboard-page");
};

commentForm.onsubmit = e => {
  e.preventDefault();
  alert("Feedback submitted!");
  commentForm.reset();
};

emojiBtns.forEach(btn => {
  btn.onclick = () => alert(`Reaction: ${btn.textContent}`);
});

// Mock email notifications for post-event
setInterval(() => {
  if (appState.currentUser?.role !== 'host') {
    appState.events.forEach(event => {
      const now = new Date();
      if (appState.checkins[event.title]?.includes(appState.currentUser.email) &&
          now > new Date(event.deadline)) {
        sendMockEmail('post-event', event);
      }
    });
  }
}, 60000);