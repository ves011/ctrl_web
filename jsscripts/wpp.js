var pdevName;
const devString = "Pompa Foraj";

var ptopicCmd;
var ptopicState;
var ptopicMonitor;
var ptopicState_a;
var ptopicMonitor_a;
var ptopicCtrl;

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
var devip;

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
    const pparams = new URLSearchParams(document.location.search);
    devip = pparams.get("ip");

    var str1 = '<a href = "./i_zone.html?dzone=';
    var str2 = '&ip='+devip + '">';
    document.getElementById("z0_lnk").innerHTML = str1 + '0' + str2 + "Zona 1</a>";
    document.getElementById("z1_lnk").innerHTML = str1 + '1' + str2 + "Zona 2</a>";
    document.getElementById("z2_lnk").innerHTML = str1 + '2' + str2 + "Zona 3</a>";
    document.getElementById("z3_lnk").innerHTML = str1 + '3' + str2 + "Zona 4</a>";
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
                if(params[0].indexOf("wp") >= 0)// && params[2] == devip)
                    pdevName = params[1];
                }
            if(params[1] == pdevName)// && params[2] == devip)
                {
                pdevName = params[1];
                var topic = params[0] + '/';
                ptopicCmd = topic + 'cmd';
                ptopicState = topic + 'state';
                ptopicMonitor = topic + 'monitor';
                ptopicState_a = ptopicState + '/w';
                ptopicMonitor_a = ptopicMonitor + '/w';
                gtopicCtrl = topic + 'ctrl';
                client_pump.subscribe(ptopicState);
                client_pump.subscribe(ptopicMonitor);
                client_pump.subscribe(ptopicState_a);
                client_pump.subscribe(ptopicMonitor_a);
                client_pump.publish(ptopicCmd, 'pump state');
                client_pump.publish(ptopicCmd, 'dv state');
                client_pump.publish(ptopicCmd, 'dv program');
                //runScript();
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
            break;
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
            break;
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
function runScript()
    {
client_pump.publish(gtopicCtrl, "echo \"0  0    0  1900-01-00T00:00:00  2024-07-06T19:15:00,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0    0  1900-01-00T00:00:00  2024-07-06T19:35:18,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  432  2024-07-06T19:40:00  2024-07-06T19:55:27,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  442  2024-07-06T20:00:00  2024-07-06T20:15:44,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0    0  2024-07-07T19:04:28  0000-00-00T00:00:00,  4 20\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0    0  2024-07-07T19:04:58  0000-00-00T00:00:00,  4 20\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  249  2024-07-07T19:06:38  2024-07-07T19:15:32,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  461  2024-07-07T19:20:00  2024-07-07T19:35:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  431  2024-07-07T19:40:01  2024-07-07T19:55:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  449  2024-07-07T20:00:00  2024-07-07T20:15:46,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  458  2024-07-09T05:00:00  2024-07-09T05:15:33,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  461  2024-07-09T05:20:00  2024-07-09T05:35:29,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  432  2024-07-09T05:40:00  2024-07-09T05:55:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0    0  2024-07-09T06:00:00  0000-00-00T00:00:00,  4 13\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  457  2024-07-10T05:00:00  2024-07-10T05:15:33,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  459  2024-07-10T05:20:00  2024-07-10T05:35:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  437  2024-07-10T05:40:00  2024-07-10T05:55:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0    0  2024-07-10T06:00:00  0000-00-00T00:00:00,  4 13\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  459  2024-07-11T05:00:00  2024-07-11T05:15:33,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  461  2024-07-11T05:20:00  2024-07-11T05:35:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  431  2024-07-11T05:40:00  2024-07-11T05:55:30,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0    0  2024-07-11T06:00:00  0000-00-00T00:00:00,  4 13\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0   91  2024-07-12T07:46:08  2024-07-12T07:50:47,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  457  2024-07-12T07:52:00  2024-07-12T08:07:32,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  460  2024-07-12T08:08:00  2024-07-12T08:23:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  440  2024-07-12T08:25:00  2024-07-12T08:40:46,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0   39  2024-07-12T11:52:00  2024-07-12T11:54:35,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  458  2024-07-13T05:00:00  2024-07-13T05:15:33,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  461  2024-07-13T05:20:00  2024-07-13T05:35:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  281  2024-07-13T05:40:00  2024-07-13T05:50:29,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  415  2024-07-13T07:25:58  2024-07-13T07:40:47,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  450  2024-07-14T05:00:00  2024-07-14T05:15:33,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  459  2024-07-14T05:20:00  2024-07-14T05:35:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  280  2024-07-14T05:40:00  2024-07-14T05:50:29,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  428  2024-07-14T05:55:00  2024-07-14T06:10:54,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  448  2024-07-15T05:00:00  2024-07-15T05:15:33,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  460  2024-07-15T05:20:00  2024-07-15T05:35:29,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  281  2024-07-15T05:40:00  2024-07-15T05:50:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  438  2024-07-15T05:55:00  2024-07-15T06:10:54,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  417  2024-07-16T06:46:51  2024-07-16T07:01:31,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  454  2024-07-16T07:03:00  2024-07-16T07:18:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  273  2024-07-16T07:20:00  2024-07-16T07:30:27,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  583  2024-07-16T07:34:00  2024-07-16T07:54:50,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  135  2024-07-17T05:10:00  2024-07-17T05:15:32,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  141  2024-07-17T05:20:00  2024-07-17T05:25:29,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  131  2024-07-17T05:30:00  2024-07-17T05:35:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  122  2024-07-17T05:40:00  2024-07-17T05:45:50,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  444  2024-07-18T05:00:01  2024-07-18T05:15:32,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  452  2024-07-18T05:20:14  2024-07-18T05:35:36,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  431  2024-07-18T05:40:03  2024-07-18T05:55:29,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  602  2024-07-18T06:00:07  2024-07-18T06:20:58,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  446  2024-07-19T05:00:00  2024-07-19T05:15:32,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  461  2024-07-19T05:20:00  2024-07-19T05:35:28,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  432  2024-07-19T05:40:00  2024-07-19T05:55:27,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  605  2024-07-19T06:00:01  2024-07-19T06:20:50,  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  445  2024-07-21T05:00:00  2024-07-21T05:15:34  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  460  2024-07-21T05:20:00  2024-07-21T05:35:28  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  282  2024-07-21T05:40:00  2024-07-21T05:50:28  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  603  2024-07-21T06:00:00  2024-07-21T06:20:51  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  439  2024-07-30T05:00:00  2024-07-30T05:15:33  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  459  2024-07-30T05:20:00  2024-07-30T05:35:29  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  272  2024-07-30T05:40:01  2024-07-30T05:50:28  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  589  2024-07-30T06:00:00  2024-07-30T06:20:50  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  430  2024-07-31T05:00:00  2024-07-31T05:15:33  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  459  2024-07-31T05:20:00  2024-07-31T05:35:29  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  272  2024-07-31T05:40:00  2024-07-31T05:50:28  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  586  2024-07-31T06:00:00  2024-07-31T06:21:21  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  425  2024-08-01T05:00:00  2024-08-01T05:15:33  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  460  2024-08-01T05:20:00  2024-08-01T05:35:29  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  271  2024-08-01T05:40:00  2024-08-01T05:50:28  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  591  2024-08-01T06:00:00  2024-08-01T06:20:51  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  417  2024-08-02T05:00:00  2024-08-02T05:15:34  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  460  2024-08-02T05:20:00  2024-08-02T05:35:29  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  271  2024-08-02T05:40:01  2024-08-02T05:50:28  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  604  2024-08-02T06:00:00  2024-08-02T06:20:52  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  442  2024-08-03T05:00:31  2024-08-03T05:15:32  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  460  2024-08-03T05:20:00  2024-08-03T05:35:28  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  270  2024-08-03T05:40:00  2024-08-03T05:50:32  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  604  2024-08-03T06:00:00  2024-08-03T06:20:51  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"0  0  457  2024-08-04T05:00:00  2024-08-04T05:15:33  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  461  2024-08-04T05:20:00  2024-08-04T05:35:29  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  271  2024-08-04T05:40:00  2024-08-04T05:50:27  2  0\" >> program_status.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  600  2024-08-04T06:00:00  2024-08-04T06:20:51  2  0\" >> program_status.txt");

client_pump.publish(gtopicCtrl, "echo \"88 5500\" >> qcal.txt");
client_pump.publish(gtopicCtrl, "echo 459 >> psensor_voffset.txt");
client_pump.publish(gtopicCtrl, "echo 100 >> pump_limits.txt");
client_pump.publish(gtopicCtrl, "echo 350 >> pump_limits.txt");
client_pump.publish(gtopicCtrl, "echo 5000 >> pump_limits.txt");
client_pump.publish(gtopicCtrl, "echo 10 >> pump_limits.txt");
client_pump.publish(gtopicCtrl, "echo 10 >> pump_limits.txt");
client_pump.publish(gtopicCtrl, "echo \"2024-07-18T11:20 > 28783069\" >> twater.txt");

client_pump.publish(gtopicCtrl, "echo \"0  0  5  0  5 15 457  7  0\" >> dv_program.txt");
client_pump.publish(gtopicCtrl, "echo \"0  1  5  0  6 30  0  7  0\" >> dv_program.txt");
client_pump.publish(gtopicCtrl, "echo \"1  0  5 20  5 35 461  7  0\" >> dv_program.txt");
client_pump.publish(gtopicCtrl, "echo \"1  1  0  1  0  0  0  7  0\" >> dv_program.txt");
client_pump.publish(gtopicCtrl, "echo \"2  0  5 40  5 50 271  7  0\" >> dv_program.txt");
client_pump.publish(gtopicCtrl, "echo \" 2  1  0  0  0  0  0  7  0\" >> dv_program.txt");
client_pump.publish(gtopicCtrl, "echo \"3  0  6  0  6 20 600  7  0\" >> dv_program.txt");
client_pump.publish(gtopicCtrl, "echo \" 3  1  0  0  0  0  0  7  0\" >> dv_program.txt");

client_pump.publish(gtopicCtrl, "echo 3 >> pump_status.txt");

    }