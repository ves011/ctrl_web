const rooms = [
  {
    rid: 0, id: 'thermos01', name: 'birou', temp: 0, target: 0, hysteresis: 0.5, act_state: 0, connected: false,
    floor: '', x: 11.7, y: 51.6, side: 'before',
  },
  {
    rid: 1, id: 'thermos02', name: 'sufragerie', temp: 0, target: 0, hysteresis: 0.5, act_state: 0, connected: false,
    floor: '', x: 22.1, y: 49.0, side: 'after',
  },
  {
    rid: 2, id: 'thermos03', name: 'bucatarie', temp: 0, target: 0, hysteresis: 0.5, act_state: 0, connected: false,
    floor: '', x: 28.1, y: 79.3,
  },
  {
    rid: 3, id: 'thermos11', name: 'dormitor 1', temp: 0, target: 0, hysteresis: 0.5, act_state: 0, connected: false,
    floor: '', x: 67.6, y: 52.0, side: 'before',
  },
  {
    rid: 4, id: 'thermos12', name: 'sufragerie', temp: 0, target: 0, hysteresis: 0.5, act_state: 0, connected: false,
    floor: '', x: 76.8, y: 49.0, side: 'after',
  },
  {
    rid: 5, id: 'thermos13', name: 'baie', temp: 0, target: 0, hysteresis: 0.5, act_state: 0, connected: false,
    floor: '', x: 83.5, y: 80.2,
  },
  {
    rid: 6, id: 'thermos14', name: 'dormitor 2', temp: 0, target: 0, hysteresis: 0.5, act_state: 0, connected: false,
    floor: '', x: 67.5, y: 67.9, side: 'below',
  },
];

let activeRoom = 0;
let editingTarget = 21;
let fahrenheit = false;
let chartRange = '24h';
// Set the development broker address and optional MQTT login here.
const mqttConfig = {
  url: 'wss://proxy.gnet/wss/',
  username: 'browser',
  password: 'browser',
  //clientId: 'hearth-browser',
  clean: true,
  connectTimeout: 4000,
};
const separator = '\x01';
const clientName = 'browser';
const histories = new Map();
let outside_temp = '--.-';
let trcount = 0;

let nrThermos = 0;
let mqttClient = null;
let mqttConnected = false;
let roomChart = null;
const thermos_query = 'linc/qthermos';
const thermos_response = 'linc/thermos';
const thermos_ctrl   = 'linc/thermosctrl';

const thist_query = 'linc/qrt_range';
const thist_response = 'linc/roomtrange';

const tstate_topic = 'linc/troomstate';
const tmonitor_topic = 'linc/troommonitor';

const startauth_topic = 'linc/startauth';
const authurl_topic   = 'linc/authurl';

const boiler_query = 'linc/qboiler';
const boiler_response = 'linc/boiler';

const westa_monitor = 'westa01/monitor';
const westa_state = 'westa01/ctrl';

function sendRequest(topic, fields) 
  {
  if (!mqttConnected) 
    return false;
  const payload = [Date.now(), clientName, ...fields, ''].join(separator);
  return mqttClient.publish(topic, payload);
  }

function requestThermostats() 
  {
  sendRequest(thermos_query, ['q']);
  }

function requestBoilerData() 
  {
  sendRequest(boiler_query, ['q']);
  }

function requestHistory(room = rooms[activeRoom], range = chartRange) 
  {
  if(!room || !range)
    return;
  const durations = { '24h': 1, '7d': 7, '30d': 30 };
  const startDate = new Date(Date.now() - durations[range] * 86400000);
  const pad = value => String(value).padStart(2, '0');
  const start = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-`+
    `${pad(startDate.getDate())}T${pad(startDate.getHours())}:`+
    `${pad(startDate.getMinutes())}:${pad(startDate.getSeconds())}`;
  sendRequest(thist_query, [room.id, start]);
  histories.set(room.id, []);
 
  }

function handleMqttMessage(topic, payload) 
  {
  const fields = payload.split(separator);
  if (fields.at(-1) === '') 
    fields.pop();
  if (topic === thermos_response) 
    handleThermostat(fields);
  else if (topic === thist_response) 
    handleHistory(fields);
  else if(topic === tstate_topic)
    {
    const fields = payload.split(separator);
    const [, , dev_id, , act_state, temp, , target_t, hysteresis, out_t] = fields;
    if(out_t != outside_temp)
      {
      if(Number(out_t) > -100)
        document.getElementById("ext_temp").innerHTML = out_t + '°';
      else
        document.getElementById("ext_temp").innerHTML = "--.-" + '°';

      outside_temp = out_t;
      }
    const room = rooms.find(item => item.id === dev_id);
    if(room)
      {
      room.connected = true;
      const temperature = Number(temp);
      const target = Number(target_t);
      if (Number.isFinite(temperature)) room.temp = temperature;
      if (Number.isFinite(target)) room.target = target;
      room.hysteresis = Number(hysteresis);
      room.act_state = Number(act_state);
      renderRooms();
      let avtemp = 0, nr = 0;
      for(const room of rooms)
        {
        if(room.connected && room.temp > 0)
          {
          avtemp += room.temp;
          nr++;
          }
        }
      if(nr)
        avtemp /= nr;
      document.getElementById("nrthermos").innerHTML = "temperatura medie (" + nr + " termostate)";
      document.getElementById("avtemp").innerHTML = displayTemp(avtemp.toString());
      }
    }
  else if(topic === tmonitor_topic)
    {
    const fields = payload.split(separator);
    const [, , dev_id, , act_state, temp, target_t, out_t] = fields;
    if(out_t != outside_temp)
      {
      if(Number(out_t) > -100)
        document.getElementById("ext_temp").innerHTML = out_t + '°';
      else
        document.getElementById("ext_temp").innerHTML = "--.-" + '°';

      outside_temp = out_t;
      }
    const room = rooms.find(item => item.id === dev_id);
    if(room)
      {
      room.connected = true;
      const temperature = Number(temp);
      const target = Number(target_t);
      if (Number.isFinite(temperature)) room.temp = temperature;
      if (Number.isFinite(target)) room.target = target;
      room.act_state = Number(act_state);
      renderRooms();
      let avtemp = 0, nr = 0;
      for(const room of rooms)
        {
        if(room.connected && room.temp > 0)
          {
          avtemp += room.temp;
          nr++;
          }
        }
      if(nr)
        avtemp /= nr;
      document.getElementById("nrthermos").innerHTML = "temperatura medie<br>" + nr + " termostate";
      document.getElementById("avtemp").innerHTML = displayTemp(avtemp.toString());
      }
    }
  else if(topic === boiler_response)
    {
    //renderBoilerMessages(payload);
    updateBoilerPage(payload);
    }
  else if(topic == authurl_topic)
    {
    handleVisAuth(fields);
    }
  }

/*
 *room id, thermos id, floor, room_name, target_temp, hysteresis
 */
function handleThermostat(fields) 
  {
  if (fields[2] == 'tcount') 
    nrThermos = Number(fields[3]);
    
  else if (fields[2] == 'trec') 
    {
    const [, , , rid, id, reportedFloor, roomName, target, hysteresis] = fields;
    const room = rooms.find(item => item.rid === Number(rid));
    if (!room) 
      return;
    room.name = roomName || room.name;
    const floor = (reportedFloor || '').trim().toLowerCase();
    room.floor = ['ground', 'upper'].includes(floor) ? floor : '';
    const targetValue = target === '' ? NaN : Number(target);
    const hysteresisValue = hysteresis === '' ? NaN : Number(hysteresis);
    if (Number.isFinite(targetValue)) 
      room.target = targetValue;
    if (Number.isFinite(hysteresisValue))
      room.hysteresis = hysteresisValue;

    room.connected = true;
    }
  }

function handleHistory(fields) 
  {
  if(fields[3] == 'trcount')
    {
    histories.clear();
    drawChart();
    const [, , id, , nrow] = fields;
    trcount = nrow;
    }
  else if (fields[2] == 'tr') 
    {
    const [, , , id, date, type, temp, target, state] = fields;
    const list = histories.get(id) || [];
    const number = value => value === '' ? NaN : Number(value);
    const record = 
      {
      date: new Date(date),
      type,
      temp: number(temp),
      target: number(target),
      state: number(state),
      };
    if (!Number.isNaN(record.date.getTime())) 
      {
      list.push(record);
      histories.set(id, list);
      if (rooms[activeRoom]?.id === id && list.length == trcount) 
        drawChart();
      }
    }
  }

function setConnection(status) 
  {
  const label = document.querySelector('#connection-label');
  const footer = document.querySelector('#data-status');
  const names = 
    {
    connecting: 'Connecting',
    connected: 'Live MQTT',
    disconnected: 'Offline',
    error: 'MQTT error',
    };
  label.textContent = names[status] || status;
  footer.textContent = status === 'connected' ? 'Live thermostat data' : 'Showing sample data';
  mqttConnected = status === 'connected';
  document.querySelector('.connection').dataset.state = status;
  /*
  document.querySelector('#target-notice').textContent = mqttConnected
    ? 'Target command topic and message are not configured yet.'
    : 'Demo only · Changes stay in this browser while MQTT is offline.';
  */
  if (mqttConnected) 
    {
    histories.clear();
    requestThermostats();
    requestBoilerData();
    }
  }

function connectMqtt() 
  {
  if (!window.mqtt) 
    {
    setConnection('error');
    return;
    }
  setConnection('connecting');
  const suffix = Math.random().toString(16).slice(2, 8);
  mqttClient = window.mqtt.connect(mqttConfig.url, 
      {
      clientId: `${mqttConfig.clientId}-${suffix}`,
      username: mqttConfig.username || undefined,
      password: mqttConfig.password || undefined,
      protocolVersion: 4,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      reconnectOnConnackError: true,
      });
  mqttClient.on('connect', () => {
      mqttClient.subscribe([
          thermos_response, 
          thist_response, 
          tstate_topic, 
          tmonitor_topic, 
          authurl_topic, 
          boiler_response,
          westa_monitor], 
        { qos: 0 }, error => setConnection(error ? 'error' : 'connected'),);});
  mqttClient.on('reconnect', () => setConnection('connecting'));
  mqttClient.on('offline', () => setConnection('disconnected'));
  mqttClient.on('close', () => setConnection('disconnected'));
  mqttClient.on('error', error => {
    const label = document.querySelector('#connection-label'); label.title = error.message; setConnection('error');});
  mqttClient.on('message', (topic, payload) => {handleMqttMessage(topic, new TextDecoder().decode(payload));});
  }

function displayTemp(celsius) 
  {
  const value = Number(celsius);
  if (!Number.isFinite(value)) return '—°';

  if (fahrenheit)
    return `${(value * 9 / 5 + 32).toFixed(1)}°`;

  return `${value.toFixed(1)}°`;
  }

function renderRooms() {
  const hotspots = rooms.map((room, index) => {
    const side = room.side || 'center';
    return `
      <button
        class="plan-hotspot${Number(room.act_state) === 1
          ? ' is-heating'
          : ''}"
        data-floor-zone="${room.floor}"
        data-side="${side}"
        data-room="${index}"
        data-thermostat-id="${room.id}"
        style="--x:${room.x}%;--y:${room.y}%"
        aria-label="${displayTemp(room.temp)} current, target
          ${displayTemp(room.target)}. Change target"
      >
        <span class="hotspot-reading">${displayTemp(room.temp)}</span>
        <span class="hotspot-target">
          <span>Target</span>
          <b>${displayTemp(room.target)}</b>
          <i>↗</i>
        </span>
      </button>
    `;
  });

  document.querySelector('#plan-hotspots').innerHTML = hotspots.join('');
}

function drawChart(range = chartRange) {
  chartRange = range;
  if (!window.Chart) return;
  const room = rooms[activeRoom];
  const records = (histories.get(room.id) || [])
    .sort((a, b) => a.date - b.date);
  const samples = records.length
    ? records
    : [{ date: new Date(), temp: room.temp, target: room.target }];
  const convert = value => fahrenheit ? value * 9 / 5 + 32 : value;
  const hourMs = 60 * 60 * 1000;
  const rangeHours = { '24h': 24, '7d': 168, '30d': 720 };
  const now = Date.now();
  const endAtHour = Math.ceil(now / hourMs) * hourMs;
  const startAtHour = endAtHour - rangeHours[range] * hourMs;
  const pad = value => String(value).padStart(2, '0');
  const timeLabel = date => {
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}/` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const chartData = {
    labels: samples.map(item => timeLabel(item.date)),
    datasets: [
      {
        label: 'Room temperature',
        data: samples.map(item => ({
          x: item.date.getTime(),
          y: Number.isFinite(item.temp) ? convert(item.temp) : null,
        })),
        borderColor: '#64886a',
        backgroundColor: 'rgba(100, 136, 106, .12)',
        pointRadius: 1.5,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: .28,
        fill: true,
        spanGaps: true,
      },
      {
        label: 'Target',
        data: samples.map(item => ({
          x: item.date.getTime(),
          y: Number.isFinite(item.target) ? convert(item.target) : null,
        })),
        borderColor: '#d6a16f',
        pointRadius: 0,
        borderWidth: 2,
        borderDash: [4, 5],
        tension: 0,
        spanGaps: true,
      },
      {
        label: 'Heating state',
        data: samples.map(item => ({
          x: item.date.getTime(),
          y: Number.isFinite(item.state) ? item.state : null,
        })),
        yAxisID: 'y1',
        borderColor: '#8596a8',
        backgroundColor: '#8596a8',
        pointRadius: 1.5,
        pointHoverRadius: 4,
        borderWidth: 2,
        //stepped: 'before',
        spanGaps: true,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: items => items.length
            ? timeLabel(new Date(items[0].parsed.x))
            : '',
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: startAtHour,
        max: Math.max(endAtHour, startAtHour + hourMs),
        grid: {
          drawOnChartArea: false,
          drawTicks: true,
          tickLength: 4,
          color: 'rgba(80, 92, 82, .28)',
        },
        ticks: {
          count: 7,
          autoSkip: false,
          maxRotation: 0,
          callback: value => timeLabel(new Date(Number(value))),
        },
        border: { display: false },
      },
      y: {
        grace: 1,
        ticks: { callback: value => `${value}°` },
        border: { display: false },
      },
      y1: {
        position: 'right',
        min: 0,
        max: 1,
        ticks: { stepSize: 1 },
        grid: { drawOnChartArea: false },
        border: { display: false },
      },
    },
  };

  if (!roomChart) {
    roomChart = new window.Chart(
      document.querySelector('#temperature-chart'),
      { type: 'line', data: chartData, options },
    );
  } else {
    roomChart.data = chartData;
    roomChart.options = options;
    roomChart.update('none');
  }
}

function changePage(name) 
  {
  document.querySelectorAll('.page').forEach(page => {page.classList.remove('active-page');});
  document.querySelectorAll('.nav-item').forEach(item => {item.classList.toggle('active', item.dataset.page === name);});
  document.querySelector(`#${name}-page`).classList.add('active-page');
  document.querySelector('#crumb').textContent =  name === 'rooms' ? 'temperaturi' : 'centrala';
  window.location.hash = name;
  }

document.querySelector('#sidebar-toggle').addEventListener('click', event => {
  const button = event.currentTarget;
  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  const showSidebar = !isExpanded;
  document.body.classList.toggle('sidebar-hidden', !showSidebar);
  button.setAttribute('aria-expanded', String(showSidebar));
  button.setAttribute(
    'aria-label',
    showSidebar ? 'Hide navigation' : 'Show navigation',
  );
  button.title = showSidebar ? 'Hide navigation' : 'Show navigation';
});
document.querySelectorAll('[data-page]').forEach(link => 
  {
  link.addEventListener('click', event => 
    {
    event.preventDefault();
    changePage(link.dataset.page);
    });
  });

document.querySelector('#plan-hotspots').addEventListener('click', event => {
  const button = event.target.closest('[data-room]');
  if (!button) return;

  activeRoom = Number(button.dataset.room);
  editingTarget = rooms[activeRoom].target;
  document.querySelector('#modal-room').textContent = rooms[activeRoom].name;
  chartRange = document.querySelector('.range').dataset.range;
  updateStepper();
  requestHistory();
  document.querySelector('#target-modal').hidden = false;
  document.querySelector('#temp-up').focus();
});

function updateStepper() {
  const unit = fahrenheit ? 'F' : 'C';
  const value = displayTemp(editingTarget).slice(0, -1);
  document.querySelector('#target-value').innerHTML =
    `${value}`;//<span>°${unit}</span>`;
}

function closeModal() {
  document.querySelector('#target-modal').hidden = true;
}

document.querySelector('#temp-down').addEventListener('click', () => {
  editingTarget = Math.max(10, editingTarget - 0.1);
  updateStepper();
});

document.querySelector('#temp-up').addEventListener('click', () => {
  editingTarget = Math.min(28, editingTarget + 0.1);
  updateStepper();
});

document.querySelector('#modal-close').addEventListener('click', closeModal);
document.querySelector('#cancel-target').addEventListener('click', closeModal);

document.querySelector('#target-modal').addEventListener('click', event => {
  if (event.target.id === 'target-modal') closeModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
});
/*
document.querySelector('#save-target').addEventListener('click', () => {
  if (mqttConnected) {
    document.querySelector('#target-notice').textContent =
      'Target command topic and message are not configured yet.';
    return;
  }
  rooms[activeRoom].target = editingTarget;
  renderRooms();
  document.querySelector('#target-notice').textContent =
    'Demo only · This change stays in the browser.';
  closeModal();
});
*/
document.querySelector('#unit-btn').addEventListener('click', () => {
  fahrenheit = !fahrenheit;
  const unit = fahrenheit ? 'F' : 'C';
  document.querySelector('#unit-btn').innerHTML = `°${unit} <span>⌄</span>`;
  renderRooms();
});

document.querySelectorAll('.range').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.range').forEach(item => {
      item.classList.remove('active');
    });
    button.classList.add('active');
    chartRange = button.dataset.range;
    requestHistory();
  });
});

document.querySelectorAll('.floor-tab').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.floor-tab').forEach(item => {
      item.classList.remove('active');
    });
    button.classList.add('active');
    document.querySelector('#plan-stage').dataset.floor = button.dataset.floor;
  });
});

document.querySelector('#refresh-btn').addEventListener('click', event => 
  {
  if(document.getElementById('rooms-page').classList.contains('active-page'))
    requestThermostats();
  else if(document.getElementById('boiler-page').classList.contains('active-page'))
    requestBoilerData();
  event.currentTarget.innerHTML = '<span>✓</span> Updated';
  setTimeout(() => 
    {
    event.target.innerHTML = '<span>↻</span> Refresh';
    }, 1200);
  });
/*
document.querySelector('#boiler-refresh').addEventListener('click', event => {
  event.currentTarget.textContent = '✓ Updated';
  setTimeout(() => {
    event.currentTarget.textContent = '↻ Refresh';
  }, 1200);
});*/
function loadPage()
  {
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  let td = new Date();
  td = td.toLocaleDateString("ro-RO", options);
  tds = td.split(",");
  if(tds.length == 2)
    document.getElementById("cdate").innerHTML = tds[0] + '<br>' + tds[1];

  if (location.hash === '#boiler') changePage('boiler');
  renderRooms();
  connectMqtt();
  }
let viessmannAuthWindow = null;
let authWindowTimer = null;
const AUTH_TIMEOUT_MS = 100000;

function requestAuth()
  {
  if (viessmannAuthWindow && !viessmannAuthWindow.closed) 
    {
    viessmannAuthWindow.focus();
    return;
    }
  else
    {
    viessmannAuthWindow = window.open('about:blank', '_blank');
    if (!viessmannAuthWindow) 
      {
      alert('Allow pop-ups to continue Viessmann authorization.');
      return;
      }
    }
  //viessmannAuthWindow.opener = null;
  authWindowTimer = setTimeout(() => 
    {
    closeAuthWindow();
    console.info('Viessmann authorization timed out.');
    }, AUTH_TIMEOUT_MS);

  if (!sendRequest(startauth_topic, ['start'])) 
    {
    viessmannAuthWindow.close();
    viessmannAuthWindow = null;
    }
  }

function handleVisAuth(fields)
  {
  const authUrl = fields[2];
  if (viessmannAuthWindow && !viessmannAuthWindow.closed)
    { 
    viessmannAuthWindow.focus();
    return;
    }
  else
    {
    viessmannAuthWindow = window.open('about:blank', '_blank');
    if (!viessmannAuthWindow) 
      {
      alert('Allow pop-ups to continue Viessmann authorization.');
      return;
      }
    }
  //viessmannAuthWindow.opener = null;
  authWindowTimer = setTimeout(() => 
    {
    closeAuthWindow();
    console.info('Viessmann authorization timed out.');
    }, AUTH_TIMEOUT_MS);

  try 
    {
    const url = new URL(authUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'iam.viessmann-climatesolutions.com')
      throw new Error('Unexpected authorization URL');

    if (!viessmannAuthWindow || viessmannAuthWindow.closed)
      throw new Error('Authorization tab is no longer open');

    viessmannAuthWindow.location.replace(url.href);
    //viessmannAuthWindow = null;
    } 
  catch (error) 
    {
    console.error('Could not open Viessmann authorization:', error);
    }
  }
  
function saveTarget()
  {
  const tt = document.getElementById("target-value").innerHTML;
  rooms[activeRoom].target = editingTarget;
  sendRequest(thermos_ctrl, [rooms[activeRoom].id, 'target-temp', tt]);
  renderRooms();
  closeModal();
  }

function closeAuthWindow() 
  {
  clearTimeout(authWindowTimer);
  authWindowTimer = null;

  if (viessmannAuthWindow && !viessmannAuthWindow.closed)
    viessmannAuthWindow.close();
  viessmannAuthWindow = null;
  }
