const VIESSMANN_CODES = {
    // --- Operating Status Codes (S.x) ---
    'S.1':  'Standby / No heat demand',
    'S.2':  'Burner startup / Fan pre-purge',
    'S.3':  'Pre-ignition active',
    'S.4':  'Ignition phase',
    'S.5':  'Flame stabilization',
    'S.6':  'Burner operating (minimum/startup load)',
    'S.7':  'Fan post-purge',
    'S.8':  'Pump overrun / Post-circulation',
    'S.10': 'Heating standby (target temperature reached)',
    'S.14': 'Domestic hot water (DHW) demand active',
    'S.17': 'DHW pump overrun',
    'S.20': 'Heating circuit active',
    'S.24': 'DHW heating active',
    'S.29': 'Burner operating (central heating)',
    'S.30': 'Room thermostat / external demand active',
    'S.31': 'Summer mode active (heating off)',
    'S.34': 'Frost protection active',
    'S.67': 'Burner anti-cycling pause (minimum off-time)',
    'S.76': 'Maintenance / service check interval',

    // --- Info & Maintenance Codes (I.x / P.x) ---
    'I.10': 'Annual maintenance due',
    'I.20': 'Water pressure low — top up system',
    'I.21': 'Water pressure high',
    'P.1':  'Service interval reminder',

    // --- Common Fault / Lockout Codes (F.x) ---
    'F.10': 'Outdoor temperature sensor short circuit',
    'F.18': 'Outdoor temperature sensor open circuit',
    'F.20': 'Supply temperature sensor fault',
    'F.30': 'Boiler temperature sensor fault',
    'F.38': 'Boiler temperature sensor short circuit',
    'F.50': 'DHW cylinder sensor fault',
    'F.67': 'Ionization / flame signal out of range',
    'F.135': 'Water pressure too low (burner locked)',
    'F.142': 'Communication error on internal bus',
    'F.354': 'Burner lockout — flame not detected (check gas supply)',
    'F.355': 'Flame loss during operation',
    'F.357': 'Gas valve / burner control fault'
};
const messageSources = [
    { key: 'device.messages.service.raw', type: 'service' },
    { key: 'device.messages.info.raw',    type: 'info' },
    { key: 'device.messages.status.raw',  type: 'status' }
    ];
const messageCategories = [
    { key: 'device.messages.service.raw', type: 'service', title: 'Service' },
    { key: 'device.messages.info.raw',    type: 'info',    title: 'Info' },
    { key: 'device.messages.status.raw',  type: 'status',  title: 'Status' }
    ];
function describeCode(rawCode) 
    {
    if (!rawCode) return '';
    if (VIESSMANN_CODES[rawCode]) return VIESSMANN_CODES[rawCode];

    // Fallback prefix classification for unlisted codes
    if (rawCode.startsWith('S.')) return 'Operating state';
    if (rawCode.startsWith('I.')) return 'Information notice';
    if (rawCode.startsWith('P.')) return 'Maintenance reminder';
    if (rawCode.startsWith('F.')) return 'System fault (check boiler)';
    return '';
    }
function ts2str(rawTimestampStr) 
    {
    var date = new Date(rawTimestampStr);
    return date.toLocaleDateString("ro-RO", {year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric"})
    }
function setCommState(isOnline) 
    {
    const badge = document.getElementById('comm-state');
    if (!badge) return;

    badge.textContent = isOnline ? 'Online' : 'Offline';
    badge.classList.toggle('is-online', isOnline);
    badge.classList.toggle('is-offline', !isOnline);
    }
function updateBoilerPage(payload)
    {
    const fields = payload.split(separator);
    const fragment = document.createDocumentFragment();
    const [, , mqtt_payload] = fields;
    const list = document.querySelector('#boiler-messages');
    let features;
    let node;

    try {features = JSON.parse(mqtt_payload);}
    catch
        {
        list.replaceChildren(Object.assign(document.createElement('p'),
        { className: 'message-empty', textContent: 'Could not read boiler message data.' }));
        return;
        }

    if(features?.viErrorId)
        {
        //if (features.statusCode === 400 || features.extendedPayload?.reason === 'DEVICE_OFFLINE') 
            setCommState(false);
        //else 
            {
            // Optional: handle other API errors (e.g., 401 token error or 429 rate limit)
            console.warn('Viessmann API error:', features.statusCode, features.errorType);
            }
        return; 
        }
    setCommState(true);

    
    // 1. Initialize the 3 category containers once on first run
    if (list.children.length === 0) 
        {
        const initFrag = document.createDocumentFragment();
        for (const cat of messageCategories) 
            {
            const group = document.createElement('div');
            group.classList.add('message-group', `message-group-${cat.type}`);
            group.dataset.category = cat.type;
            const heading = document.createElement('h3');
            heading.classList.add('message-group-title', `message-${cat.type}`);
            heading.textContent = `${cat.title} (0)`;
            group.append(heading);
            initFrag.append(group);
            }
        list.replaceChildren(initFrag);
        }
    for (const cat of messageCategories) 
        {
        if (!Object.prototype.hasOwnProperty.call(features, cat.key))
            continue; // Feature did not change -> leave existing DOM untouched

        const node = features[cat.key];
        const entries = (node && node.isReady && Array.isArray(node.properties?.entries?.value))
            ? [...node.properties.entries.value] : [];

        // Sort newest first within each category
        entries.sort((a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0));

        const group = list.querySelector(`.message-group-${cat.type}`);
        if (!group) 
            continue;

        const groupFrag = document.createDocumentFragment();
        const heading = document.createElement('h3');
        heading.classList.add('message-group-title', `message-${cat.type}`);
        heading.textContent = `${cat.title} (${entries.length})`;
        groupFrag.append(heading);

        for (const message of entries) 
            {
            const row = document.createElement('article');
            row.classList.add('message-row', `message-${cat.type}`);

            const code = document.createElement('strong');
            code.textContent = (message.errorCode || 'MSG').trim();

            const desc = document.createElement('span');
            desc.className = 'message-desc';
            desc.textContent = describeCode(message.errorCode);

            const time = document.createElement('time');
            const timestamp = Date.parse(message.timestamp || '');
            if (Number.isFinite(timestamp)) 
                {
                time.dateTime = new Date(timestamp).toISOString();
                time.textContent = new Date(timestamp).toLocaleString('ro-RO', {dateStyle: 'medium', timeStyle: 'medium'});
                }
            else
                time.textContent = '--';

            row.append(code, desc, time);
            groupFrag.append(row);
            }
        group.replaceChildren(groupFrag);
        }

    node = features['heating.sensors.pressure.supply'];
    if(node && node.isReady)
        {
        document.getElementById("p_value").innerHTML = node.properties.value.value;
        document.getElementById("p_date").innerHTML = ts2str(node.timestamp);
        }

    node = features['heating.burners.0'];
    if(node && node.isReady)
        {
        if(node.properties.active.value == true)
            {
            document.getElementById("burn_state").innerHTML = "on";
            document.getElementById("boiler-state").innerHTML = "On";
            document.getElementById("boiler-state").style.color = "#ff0000";
            }
        else
            {
            document.getElementById("burn_state").innerHTML = "off";
            document.getElementById("boiler-state").innerHTML = "Off";
            document.getElementById("boiler-state").style.color = "#808080";
            }
        document.getElementById("burn_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.burners.0.modulation'];
    if(node && node.isReady)
        {
        document.getElementById("burn_mod").innerHTML = node.properties.value.value;
        document.getElementById("mod_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.circuits.0.operating.modes.active'];
    if(node && node.isReady)
        {
        document.getElementById("h_state").innerHTML = node.properties.value.value == "heating" ? "activa" : "inactiva";
        document.getElementById("state_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.circuits.0.operating.programs.active'];
    if(node && node.isReady)
        {
        document.getElementById("prog_type").innerHTML = node.properties.value.value;
        document.getElementById("prog_date").innerHTML = ts2str(node.timestamp);
        }
        
    node = features['heating.circuits.0.operating.programs.normal'];
    if(node && node.isReady)
        {
        document.getElementById("temp_set").innerHTML = node.properties.temperature.value;
        document.getElementById("temps_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.boiler.sensors.temperature.commonSupply'];
    if(node && node.isReady)
        {
        document.getElementById("temp_cs").innerHTML = node.properties.value.value;
        document.getElementById("tempcs_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.boiler.pumps.internal'];
    if(node && node.isReady)
        {
        document.getElementById("h_pump").innerHTML = node.properties.status.value;
        document.getElementById("hpump_date").innerHTML = ts2str(node.timestamp);
        }

    node = features['heating.dhw'];
    if(node && node.isReady)
        {
        document.getElementById("dhw_state").innerHTML = node.properties.status.value == "on" ? "activa" : "inactiva";
        document.getElementById("dhwstate_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.dhw.temperature.main'];
    if(node && node.isReady)
        {
        document.getElementById("dhw_temp").innerHTML = node.properties.value.value;
        document.getElementById("dhwtemp_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.dhw.sensors.temperature.dhwCylinder'];
    if(node && node.isReady)
        {
        document.getElementById("dhw_ctemp").innerHTML = node.properties.value.value;
        document.getElementById("dhwctemp_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.dhw.sensors.temperature.outlet'];
    if(node && node.isReady)
        {
        document.getElementById("dhw_htemp").innerHTML = node.properties.value.value;
        document.getElementById("dhwhtemp_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.dhw.pumps.secondary'];
    if(node && node.isReady)
        {
        document.getElementById("dhw_pump").innerHTML = node.properties.status.value;
        document.getElementById("dhwpump_date").innerHTML = ts2str(node.timestamp);
        }
    node = features['heating.gas.consumption.summary.heating'];
    if(node && node.isReady)
        {
        document.getElementById("gh_td").innerHTML = node.properties.currentDay.value;
        document.getElementById("gh_7d").innerHTML = node.properties.lastSevenDays.value;
        document.getElementById("gh_cm").innerHTML = node.properties.currentMonth.value;
        document.getElementById("gh_cy").innerHTML = node.properties.currentYear.value;
        }
    node = features['heating.gas.consumption.summary.dhw'];
    if(node && node.isReady)
        {
        document.getElementById("gd_td").innerHTML = node.properties.currentDay.value;
        document.getElementById("gd_7d").innerHTML = node.properties.lastSevenDays.value;
        document.getElementById("gd_cm").innerHTML = node.properties.currentMonth.value;
        document.getElementById("gd_cy").innerHTML = node.properties.currentYear.value;
        }
    node = features['heating.power.consumption.summary.heating'];
    if(node && node.isReady)
        {
        document.getElementById("ph_td").innerHTML = node.properties.currentDay.value;
        document.getElementById("ph_7d").innerHTML = node.properties.lastSevenDays.value;
        document.getElementById("ph_cm").innerHTML = node.properties.currentMonth.value;
        document.getElementById("ph_cy").innerHTML = node.properties.currentYear.value;
        }
    node = features['heating.power.consumption.summary.dhw'];
    if(node && node.isReady)
        {
        document.getElementById("pd_td").innerHTML = node.properties.currentDay.value;
        document.getElementById("pd_7d").innerHTML = node.properties.lastSevenDays.value;
        document.getElementById("pd_cm").innerHTML = node.properties.currentMonth.value;
        document.getElementById("pd_cy").innerHTML = node.properties.currentYear.value;
        }
    }