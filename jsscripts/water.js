var wdevName;
const devString = "Controler irigatie";

var wtopicCmd;
var wtopicState;
var wtopicMonitor;

var w_connected = false;
var client_watering;
var wstatus = 0,    dv0_state = 0, dv0_starth = 0, dv0_startm = 0, dv0_stoph = 0, dv0_stopm = 0, dv0_cs = 0, dv0_fault = 0;
var                 dv1_state = 0, dv1_starth = 0, dv1_startm = 0, dv1_stoph = 0, dv1_stopm = 0, dv1_cs = 0, dv1_fault = 0;
var p_status, p_running, p_pressure;
var hrow;
const phv = [];

function getWateringClient()
    {
    const url = 'wss://proxy.gnet/wss/';
    const options = 
        {
        // Clean session
        clean: true,
        connectTimeout: 4000,
        // Authentication
        username: 'browser',
        password: 'browser',
        }
    wdevName = '';
    if(w_connected)
        client_watering.end();
    client_watering  = mqtt.connect(url, options);
    client_watering.on('connect', function (connack) 
        {
        w_connected = true;
        client_watering.subscribe('gnetdev/response');
        client_watering.subscribe('$SYS/broker/clients/connected');
        client_watering.publish('gnetdev/query', 'reqID');
        });
    client_watering.on('reconnect', function (data) {console.log('Reconnecting...')});
    client_watering.on('close', function (data) {console.log('Disconnected')});
    client_watering.on('disconnect', function (packet) {console.log(packet)});
    client_watering.on('error', function (error){console.log(error)})
    client_watering.on('message', function (topic, payload, packet) {processMessage(topic, payload, packet)});
    }

function processMessage(topic, payload, packet)
    {
    b = String.fromCharCode(...payload);
    console.log('Message from server ', topic + ': ' + b);
    params = b.split('\1');
    switch(topic)
        {
        case 'gnetdev/response':
            if(wdevName == '')
                {
                if(params[0].indexOf("water") >= 0)
                    wdevName = params[1];
                }
            if(params[1] == wdevName)
                {
                var topic = params[0] + '/';
                wtopicCmd = topic + 'cmd';
                wtopicState = topic + 'state';
                wtopicMonitor = topic + 'monitor';
                client_watering.subscribe(wtopicState);
                client_watering.subscribe(wtopicMonitor);
                client_watering.publish(wtopicCmd, 'state');
                client_watering.publish(wtopicCmd, 'readps');
                }
            break;
        case wtopicState:
            if(params[2] == "state")
                ProcessState(params);
            if(params[2] == "phist")
                UpadteHistory(params);
            break;
        case wtopicMonitor:
            break;
        default:
            break;
        }
    }
function UpdateProgramState()
    {
    var tm = FormatTime(dv0_starth, dv0_startm)
    document.getElementById("dv0_start").value = tm;//dv0_starth + ":" + dv0_startm;
    tm = FormatTime(dv0_stoph, dv0_stopm)
    document.getElementById("dv0_stop").value = tm;
    if(dv0_cs >= 0 && dv0_cs < 3)
        document.getElementById("reset_p0").innerHTML = "OK" + dv0_cs;
    else
        document.getElementById("reset_p0").innerHTML = "NOK" + dv0_cs;
    tm = FormatTime(dv1_starth, dv1_startm)
    document.getElementById("dv1_start").value = tm;//dv0_starth + ":" + dv0_startm;
    tm = FormatTime(dv1_stoph, dv1_stopm)
    document.getElementById("dv1_stop").value = tm;
    if(dv1_cs >= 0 && dv1_cs < 3)
        document.getElementById("reset_p1").innerHTML = "OK" + dv1_cs;
    else
        document.getElementById("reset_p1").innerHTML = "NOK" + dv1_cs;
    }
function UpdateDVState()
    {
    if(dv0_state == 0)
        {
        document.getElementById("bdv0").innerHTML = "EV0&#8594ON";
        document.getElementById("bdv0").className = "button_dv button_enabled button_online";
        document.getElementById("leddv0").className = "led_dv led_off";
        }
    else
        {
        document.getElementById("bdv0").innerHTML = "EV0&#8594OFF";
        document.getElementById("bdv0").className = "button_dv button_enabled button_offline";
        document.getElementById("leddv0").className = "led_dv led_on";
        }
    if(dv1_state == 0)
        {
        document.getElementById("bdv1").innerHTML = "EV1&#8594ON";
        document.getElementById("bdv1").className = "button_dv button_enabled button_online";
        document.getElementById("leddv1").className = "led_dv led_off";
        }
    else
        {
        document.getElementById("bdv1").innerHTML = "EV1&#8594OFF";
        document.getElementById("bdv1").className = "button_dv button_enabled button_offline";
        document.getElementById("leddv1").className = "led_dv led_on";
        }
    }
function UpdatePumpState()
    {
    document.getElementById("ppres").innerHTML = p_pressure;
    if(p_status == 2) //online
        {
        if(p_running == 1) //running
            document.getElementById("ledpump").className = "led_dv led_on";
        else // not running
            document.getElementById("ledpump").className = "led_dv led_online";
        }
    else if(p_status == 3) //offline
        {
        if(p_running == 1) //running
            document.getElementById("ledpump").className = "led_dv led_on";
        else // not running
            document.getElementById("ledpump").className = "led_dv led_off";
        }
    else // pump fault
        {
        document.getElementById("ledpump").className = "led_dv led_fault";
        }
    }
function clean_connection()
    {
    if(w_connected)
        client_watering.end();
    }
function FormatTime( h, m)
    {
    var tf;
    if(h < 10)
        tf = "0" + h + ":";
    else
        tf = h+":";
    if(m < 10)
        tf += "0" + m;
    else
        tf += m;
    return tf;    
    }
function TimeUpdate(target)
    {
    var v;
    if(target == "dv0_start")
        {
        v = document.getElementById("dv0_start").value;
        document.getElementById("save_p0").className = "bsave button_enabled";
        }
    else if(target == "dv0_stop")
        {
        v = document.getElementById("dv0_stop").value;
        document.getElementById("save_p0").className = "bsave button_enabled";
        }
    else if(target == "dv1_start")
        {
        v = document.getElementById("dv1_start").value;
        document.getElementById("save_p1").className = "bsave button_enabled";
        }
    else if(target == "dv1_stop")
        {
        v = document.getElementById("dv1_stop").value;
        document.getElementById("save_p1").className = "bsave button_enabled";
        }
    }
function ChangeDVStatus(target)
    {
    if(target == "DV0")
        {
        if(dv0_state == 0)
            client_watering.publish(wtopicCmd, 'open 0');
        else
            client_watering.publish(wtopicCmd, 'close 0');
        }
    else if(target == "DV1")
        {
        if(dv1_state == 0)
            client_watering.publish(wtopicCmd, 'open 1');
        else
            client_watering.publish(wtopicCmd, 'close 1');
        }
    client_watering.publish(wtopicCmd, 'state');
    }
function UpadteHistory(params)
    {
    to = document.getElementById("thist");
    if(params[3] == "start")
        {
        while((nrows = to.rows.length) > 1)
            to.deleteRow(-1);
        hrow = 0;
        }
    else if(params[3] == "end")
        {
        var n = params[4];
        if(hrow == n)
            {
            for(i = n - 1; i >= 0; i--)
                {
                var x = to.insertRow(-1);
                var y = x.insertCell(0);
                y.style.width = "250px";
                y.style.textAlign = "left";
                y.innerHTML = phv[i].dt;
                y = x.insertCell(1);
                y.style.width = "40px";
                y.style.textAlign = "center";
                y.innerHTML = phv[i].dv;
                y = x.insertCell(2);
                y.style.width = "45px";
                y.style.textAlign = "center";
                y.innerHTML = phv[i].cs;
                y = x.insertCell(3);
                y.style.width = "40px";
                y.style.textAlign = "center";
                y.innerHTML = phv[i].err;
                }
            }
        }
    else
        {
        var data = params[3].split(' ');
        var d3 = data[3].split('\n');
        const ph = {dt: data[0], dv: data[1], cs: data[2], err: d3[0]};
        phv[hrow] = ph;
        hrow++;
        }
    }
function ProcessState(params)
    {
    wstatus = params[3];
    if(params[4] == 0)
        {
        dv0_state = params[6];
        dv1_state = params[8];
        }
    else
        {
        dv1_state = params[6];
        dv0_state = params[8];
        }
    if(params[9] == 0)
        {
        dv0_starth = params[10]; dv0_startm = params[11]; dv0_stoph = params[12]; dv0_stopm = params[13]; dv0_cs = params[14]; dv0_fault = params[15];
        dv1_starth = params[17]; dv1_startm = params[18]; dv1_stoph = params[19]; dv1_stopm = params[20]; dv1_cs = params[21]; dv1_fault = params[22];
        }
    else if(params[9] == 1)
        {
        dv1_starth = params[10]; dv1_startm = params[11]; dv1_stoph = params[12]; dv1_stopm = params[13]; dv1_cs = params[14]; dv1_fault = params[15];
        dv0_starth = params[17]; dv0_startm = params[18]; dv0_stoph = params[19]; dv0_stopm = params[20]; dv0_cs = params[21]; dv0_fault = params[22];
        }
    else
        {
        dv0_starth = 0; dv0_startm = 0; dv0_stoph = 0; dv0_stopm = 0; dv0_cs = 0; dv0_fault = 0;
        dv1_starth = 0; dv1_startm = 0; dv1_stoph = 0; dv1_stopm = 0; dv1_cs = 0; dv1_fault = 0;
        }
    p_status = params[23];
    p_running = params[24];
    p_pressure = params[25];
    UpdateProgramState();
    UpdateDVState();
    UpdatePumpState();
    }