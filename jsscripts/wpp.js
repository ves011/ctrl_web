var pdevName;
const devString = "Pompa Foraj";

var ptopicCmd;
var ptopicState;
var ptopicMonitor;
var ptopicState_a;
var ptopicMonitor_a;

var p_connected = false;
var client_pump;

var pump_mon = {state: 0, status: 0, current: 0, pres_kpa: 0, debit: 0, total_qwater: 0};
const DVCOUNT = 4;
const wpday = 2;
var dv_status = [{dv_no: 0, dv_state: 0}];
var dv_program = [{dv_no: 0, no: 0, starth: 0, startm: 0, stoph: 0, stopm: 0, qwater: 0, cs: 0, fault: 0}];
var watering_status = -1;
var active_dv = -1;
var active_no = -1;
var color_idx = true;
var dvop_inprogress = 0;

const ONLINE = 2;
const OFFLINE = 3;
const PUMP_ON = 1;
const PUMP_OFF = 0;
const PUMP_FAULT = 4;


function getPumpClient()
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
    pdevName = '';
    if(p_connected)
        client_pump.end();
    client_pump  = mqtt.connect(url, options);
    client_pump.on('connect', function (connack) 
        {
        p_connected = true;
        client_pump.subscribe('gnetdev/response');
        //client_pump.subscribe('$SYS/broker/clients/connected');
        client_pump.publish('gnetdev/query', 'reqID');
        });
    client_pump.on('reconnect', function (data) {console.log('Reconnecting...')});
    client_pump.on('close', function (data) {console.log('Disconnected')});
    client_pump.on('disconnect', function (packet) {console.log(packet)});
    client_pump.on('error', function (error){console.log(error)})
    client_pump.on('message', function (topic, payload, packet) {processMessage(topic, payload, packet)});
    }
function gotoSettings()
    {
    window.location.assign("pumpsettings.html");
    }

function processMessage(topic, payload, packet)
    {
    b = String.fromCharCode(...payload);
    console.log('Message from server ', topic + ': ' + b);
    params = b.split('\x01');
    switch(topic)
        {
        case 'gnetdev/response':
            if(pdevName == '')
                {
                if(params[0].indexOf("wp") >= 0)
                    pdevName = params[1];
                }
            if(params[1] == pdevName)
                {
                pdevName = params[1];
                var topic = params[0] + '/';
                ptopicCmd = topic + 'cmd';
                ptopicState = topic + 'state';
                ptopicMonitor = topic + 'monitor';
                ptopicState_a = ptopicState + '/w';
                ptopicMonitor_a = ptopicMonitor + '/w';
                client_pump.subscribe(ptopicState);
                client_pump.subscribe(ptopicMonitor);
                client_pump.subscribe(ptopicState_a);
                client_pump.subscribe(ptopicMonitor_a);
                client_pump.publish(ptopicCmd, 'pump state');
                client_pump.publish(ptopicCmd, 'dv state');
                client_pump.publish(ptopicCmd, 'dv program');

                }
            break;
        case ptopicState:
            document.getElementById("minP").innerHTML = params[8];
            document.getElementById("maxP").innerHTML = params[9];
            document.getElementById("pkpa").innerHTML = params[6];
            document.getElementById("current").innerHTML = Number(params[5]/1000).toFixed(2);
            document.getElementById("qmeter").innerHTML = params[13];
            document.getElementById("total_water").innerHTML = Number(params[14] / 1000000).toFixed(2);
            updatePumpUI(params[3], params[4]);
            break;
        case ptopicState_a:
            switch(params[2])
                {
                case 'state':
                    watering_status = params[3];
                    active_dv = params[4];
                    active_no = params[5];
                    k = 6;
                    for(i = 0; i < DVCOUNT; i ++)
                        {
                        dv_status[i] = {dv_no: params[k], dv_state: params[k + 1]};
                        k+= 2;
                        }
                    UpdateZoneUI('state');
                    break;
                case 'program':
                    k = 3;
                    for(i = 0; i < DVCOUNT * wpday; i++)
                        {
                        dv_program[i] = {dv_no: params[k++], no: params[k++], 
                            starth: params[k++], startm: params[k++], stoph: params[k++], stopm: params[k++], 
                            qwater: params[k++], cs: params[k++], fault: params[k++]};
                        }
                    UpdateZoneUI('program');
                    break;
                case 'phist':
                    break;
                }
        case ptopicMonitor:
            pump_mon = {state: params[3], status: params[4], current: params[5], pres_kpa: params[6], debit: params[7], total_qwater: params[8]};
            document.getElementById("pkpa").innerHTML = pump_mon.pres_kpa;
            document.getElementById("current").innerHTML = Number(pump_mon.current/1000).toFixed(2);
            document.getElementById("qmeter").innerHTML = pump_mon.debit;
            document.getElementById("total_water").innerHTML = Number(pump_mon.total_qwater/1000).toFixed(2);
            updatePumpUI(pump_mon.state, pump_mon.status);
            break;
        case ptopicMonitor_a:
            switch(params[2])
                {
                case 'dvop':
                    if(dvop_inprogress == 2)
                    st = document.getElementById("state" + params[3]);
                    if(st.style.backgroundColor == "white")
                        st.style.backgroundColor = "grey";
                    else
                        st.style.backgroundColor = "white";
                    break;
                case 'wstate':
                    k = 0;
                    for(i = 0; i < DVCOUNT; i++)
                        {
                        for(j = 0; j < wpday; j++)
                            {
                                
                            }
                        }
                    break;
                case 'dvstate':
                    st = document.getElementById("state" + params[3]);
                    st.style.backgroundColor = "white";
                    if(params[4] == '1')
                        {
                        st.style.color = "green";
                        st.innerHTML = 'deschis';
                        }
                    else
                        {
                        st.style.color = "blue";
                        st.innerHTML = 'inchis';
                        }
                    dvop_inprogress = 2;
                    break;
                }
        default:
            break;
        }
    }
function updatePumpUI(p1, p2)
    {
//update leds state

    if(p2 == ONLINE) // status = online
        document.getElementById("ledstatus").className = "button_led led_pos led_on";
    else
        document.getElementById("ledstatus").className = "button_led led_pos led_off";

    if(p1 == PUMP_ON) //pump running
        {
        document.getElementById("ledrunning").className = "button_led ledr_pos led_on";
        document.getElementById("ledfault").className = "button_led ledf_pos led_off";
        }
    else if(p1 == PUMP_OFF) // pump off
        {
        document.getElementById("ledrunning").className = "button_led ledr_pos led_off";
        document.getElementById("ledfault").className = "button_led ledf_pos led_off";
        }
    else if(p1 == PUMP_FAULT) // state = fault
        {
        document.getElementById("ledrunning").className = "button_led ledr_pos led_off";
        document.getElementById("ledfault").className = "button_led ledf_pos led_fault";
        }

//update buttons state
    if(p2 == ONLINE) // online
        {
        //document.getElementById("settings").className = "bsettings bsettings_disabled";
        document.getElementById("bstatus").className = "button button-poss button_enabled button_offline";
        document.getElementById("bstatus").innerHTML = "set OFFLINE";
        //document.getElementById("startstop").className = "button button-posi button_disabled";
        //document.getElementById("startstop").innerHTML = "Start";
        }
    else
        {
        if(p1 ==  PUMP_OFF || p1 == PUMP_FAULT)// stop || fault and offline --> enable all buttons
            {
            //document.getElementById("settings").className = "bsettings";
            document.getElementById("bstatus").className = "button button-poss button_online";
            document.getElementById("bstatus").innerHTML = "set ONLINE";
            }
        else if(p1 == PUMP_ON) // running offline
            {
            //document.getElementById("settings").className = "bsettings bsettings_disabled";
            document.getElementById("bstatus").className = "button button-poss button_disabled button_online";
            document.getElementById("bstatus").innerHTML = "set ONLINE";
            }
        }
    }
function UpdateZoneUI(what)
    {
	if(what == 'state')
		{
	    for(i = 0; i < DVCOUNT; i++)
	        {
			
	        if(dv_status[i].dv_state == 1)
				{
				document.getElementById("state" + i).innerHTML = 'deschis';
				document.getElementById("state" + i).style.color = 'green';
				}
	        else
				{
				document.getElementById("state" + i).innerHTML = 'inchis';
				document.getElementById("state" + i).style.color = 'blue';
				}
	        }	
		}
	else if(what == 'program')
		{
        k = 0;

        for(i = 0; i < DVCOUNT; i++)
            {
            for(j = 0; j < wpday; j++)
                {
                start = document.getElementById("start" + i + j);
                stop = document.getElementById("stop" + i + j);
                qw = document.getElementById("qwater" + i + j);
                st = document.getElementById("pstate" + i + j);

                start.style.color = 'black';
                stop.style.color = "black";
                qw.style.color = "black";
                st.style.color = "black";
                
				start.innerHTML = String(dv_program[k].starth).padStart(2, '0') + ':' + String(dv_program[k].startm).padStart(2, '0'); 
                stop.innerHTML = String(dv_program[k].stoph).padStart(2, '0') + ':' + String(dv_program[k].stopm).padStart(2, '0');
                qw.innerHTML = dv_program[k].qwater;
                switch(dv_program[k].cs)
                    {
                    case '0':
                        st.innerHTML = 'reset';
                        break;
                    case '1':
                        st.innerHTML = 'activ';
                        break;
                    case '2':
                        st.innerHTML = 'OK-0';
                        break;
                    case '3':
                    case '4':
                    case '5':
                    case '6':
                        st.innerHTML = dv_program[k].cs + ' - ' + dv_program[k].fault;
                        break;
                    case '7':
                        start.style.color = 'lightgrey';
                        stop.style.color = "lightgrey";
                        qw.style.color = "lightgrey";
                        st.style.color = "lightgrey";
                        st.innerHTML = "NA";
                        break;
                    
                    }
                k++;
                }
            }
		}

    }
function changePumpStatus()
    {
    if(document.getElementById("bstatus").innerHTML == "set ONLINE")
        client_pump.publish(ptopicCmd, 'pump online');
    else
        client_pump.publish(ptopicCmd, 'pump offline');
    }
function openDV(dvno)
    {
    if(dv_status[dvno].dv_state == 0)
        client_pump.publish(ptopicCmd, 'dv open ' + dvno);
    else
        client_pump.publish(ptopicCmd, 'dv close ' + dvno);
    }
/*
function startPump()
    {
    if(document.getElementById("startstop").innerHTML == "Start")
        client_pump.publish(ptopicCmd, 'start');
    else
        client_pump.publish(ptopicCmd, 'stop');
    }
*/
