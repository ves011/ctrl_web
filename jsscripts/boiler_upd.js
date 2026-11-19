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

function ts2str(rawTimestampStr) 
    {
    var date = new Date(rawTimestampStr);
    return date.toLocaleDateString("ro-RO", {year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric"})
/*        
    if (!rawTimestampStr || rawTimestampStr.length < 16) 
        return "";
    const datePart = rawTimestampStr.slice(0, 10);
    const timePart = rawTimestampStr.slice(11, 16);
    return `${datePart} / ${timePart}`;
*/    
    }
function updateBoilerPage(payload)
    {
    const fields = payload.split(separator);
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
    
    node = features['device.messages.status.raw'];
    if(node && node.isReady)
        {
        const messages = node.properties.entries.value;
        if (!Array.isArray(messages) || messages.length === 0)
            {
            list.replaceChildren(Object.assign(document.createElement('p'),
                { className: 'message-empty', textContent: 'No current status messages.' }));
            }
        else
            {
            const fragment = document.createDocumentFragment();
            for (const message of messages)
                {
                const row = document.createElement('article');
                row.classList.add("message-row");
                const code = document.createElement('strong');
                code.textContent = message.errorCode || 'Status message';
                const time = document.createElement('time');
                const ts = message.timestamp.endsWith('Z') ? message.timestamp.slice(0, -1) : message.timestamp;
                const timestamp = Date.parse(ts || '');
                if (Number.isFinite(timestamp))
                    {
                    time.dateTime = new Date(timestamp).toISOString();
                    time.textContent = new Date(timestamp).toLocaleString("ro-RO",
                        { dateStyle: 'medium', timeStyle: 'medium' });
                    }
                else
                    time.textContent = '--';
                row.append(code, time);
                fragment.append(row);
                }
            list.replaceChildren(fragment);
            }
        }
        
    node = features['device.lock.malfunction'];
    if(node && node.isReady)
        {
        const fragment = document.createDocumentFragment();
        const bm = document.querySelector('#lock-messages');
        const row = document.createElement('article');
        row.classList.add("message-row");
        const code = document.createElement('strong');
        code.textContent = 'Lock state: ' + node.properties.active.value;
        const time = document.createElement('time');
        const ts = node.timestamp.endsWith('Z') ? node.timestamp.slice(0, -1) : node.timestamp;
        const timestamp = Date.parse(ts || '');
        if (Number.isFinite(timestamp))
            {
            time.dateTime = new Date(timestamp).toISOString();
            time.textContent = new Date(timestamp).toLocaleString("ro-RO",
                { dateStyle: 'medium', timeStyle: 'medium' });
            }
        else
            time.textContent = '--';
        row.append(code, time);
        fragment.append(row);
        bm.replaceChildren(fragment);
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
        //document.getElementById("gh_pm").innerHTML = node.properties.lastMonth.value;
        document.getElementById("gh_cy").innerHTML = node.properties.currentYear.value;
        //document.getElementById("gh_py").innerHTML = node.properties.lastYear.value;
        }
    node = features['heating.gas.consumption.summary.dhw'];
    if(node && node.isReady)
        {
        document.getElementById("gd_td").innerHTML = node.properties.currentDay.value;
        document.getElementById("gd_7d").innerHTML = node.properties.lastSevenDays.value;
        document.getElementById("gd_cm").innerHTML = node.properties.currentMonth.value;
        //document.getElementById("gd_pm").innerHTML = node.properties.lastMonth.value;
        document.getElementById("gd_cy").innerHTML = node.properties.currentYear.value;
        //document.getElementById("gd_py").innerHTML = node.properties.lastYear.value;
        }
    node = features['heating.power.consumption.summary.heating'];
    if(node && node.isReady)
        {
        document.getElementById("ph_td").innerHTML = node.properties.currentDay.value;
        document.getElementById("ph_7d").innerHTML = node.properties.lastSevenDays.value;
        document.getElementById("ph_cm").innerHTML = node.properties.currentMonth.value;
        //document.getElementById("ph_pm").innerHTML = node.properties.lastMonth.value;
        document.getElementById("ph_cy").innerHTML = node.properties.currentYear.value;
        //document.getElementById("ph_py").innerHTML = node.properties.lastYear.value;
        }
    node = features['heating.power.consumption.summary.dhw'];
    if(node && node.isReady)
        {
        document.getElementById("pd_td").innerHTML = node.properties.currentDay.value;
        document.getElementById("pd_7d").innerHTML = node.properties.lastSevenDays.value;
        document.getElementById("pd_cm").innerHTML = node.properties.currentMonth.value;
        //document.getElementById("pd_pm").innerHTML = node.properties.lastMonth.value;
        document.getElementById("pd_cy").innerHTML = node.properties.currentYear.value;
        //document.getElementById("pd_py").innerHTML = node.properties.lastYear.value;
        }
    }