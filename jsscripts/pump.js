var pdevName;
const devString = "Pompa Foraj";

var ptopicCmd;
var ptopicState;
var ptopicMonitor;

var p_connected = false;
var client_pump;


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
        client_pump.subscribe('$SYS/broker/clients/connected');
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
    params = b.split('\1');
    switch(topic)
        {
        case 'gnetdev/response':
            if(pdevName == '')
                {
                if(params[0].indexOf("pump") >= 0)
                    pdevName = params[1];
                }
            if(params[1] == pdevName)
                {
                pdevName = params[1];
                var topic = params[0] + '/';
                ptopicCmd = topic + 'cmd';
                ptopicState = topic + 'state';
                ptopicMonitor = topic + 'monitor';
                client_pump.subscribe(ptopicState);
                client_pump.subscribe(ptopicMonitor);
                client_pump.publish(ptopicCmd, 'state');
                }
            break;
        case ptopicState:
            document.getElementById("minP").innerHTML = params[7];
            document.getElementById("maxP").innerHTML = params[8];
            document.getElementById("pkpa").innerHTML = params[5];
            params[4] = '3428';
            document.getElementById("current").innerHTML = Number(params[4]/1000).toFixed(2);
            updateUI(params[2], params[3]);
            break;
        case ptopicMonitor:
            document.getElementById("pkpa").innerHTML = params[5];
            document.getElementById("current").innerHTML = Number(params[4]/1000).toFixed(2);
            updateUI(params[2], params[3]);
            break;
        default:
            break;
        }
    }
function updateUI(p1, p2)
    {
//update leds state

    if(p2 == 2) // status = online
        document.getElementById("ledstatus").className = "button_led led_pos led_on";
    else
        document.getElementById("ledstatus").className = "button_led led_pos led_off";

    if(p1 == 1) //pump running
        {
        document.getElementById("ledrunning").className = "button_led ledr_pos led_on";
        document.getElementById("ledfault").className = "button_led ledf_pos led_off";
        }
    else if(p1 == 0) // pump off
        {
        document.getElementById("ledrunning").className = "button_led ledr_pos led_off";
        document.getElementById("ledfault").className = "button_led ledf_pos led_off";
        }
    else if(p1 == 2) // state = fault
        {
        document.getElementById("ledrunning").className = "button_led ledr_pos led_off";
        document.getElementById("ledfault").className = "button_led ledf_pos led_fault";
        }

//update buttons state
    if(p2 == 2) // online
        {
        //document.getElementById("settings").className = "bsettings bsettings_disabled";
        document.getElementById("bstatus").className = "button button-poss button_enabled button_offline";
        document.getElementById("bstatus").innerHTML = "set OFFLINE";
        document.getElementById("startstop").className = "button button-posi button_disabled";
        document.getElementById("startstop").innerHTML = "Start";
        }
    else
        {
        if(p1 == "0" || p1 == "2")// stop || fault and offline --> enable all buttons
            {
            //document.getElementById("settings").className = "bsettings";
            document.getElementById("bstatus").className = "button button-poss button_online";
            document.getElementById("bstatus").innerHTML = "set ONLINE";
            document.getElementById("startstop").className = "button button-posi button_enabled";
            document.getElementById("startstop").innerHTML = "Start";
            }
        else if(p1 == 1) // running offline
            {
            //document.getElementById("settings").className = "bsettings bsettings_disabled";
            document.getElementById("bstatus").className = "button button-poss button_disabled button_online";
            document.getElementById("bstatus").innerHTML = "set ONLINE";
            document.getElementById("startstop").className = "button button-posi button_enabled";
            document.getElementById("startstop").innerHTML = "Stop";
            }
        }
    }

function changeStatus()
    {
    if(document.getElementById("bstatus").innerHTML == "set ONLINE")
        client_pump.publish(ptopicCmd, 'online');
    else
        client_pump.publish(ptopicCmd, 'offline');
    }

function startPump()
    {
    if(document.getElementById("startstop").innerHTML == "Start")
        client_pump.publish(ptopicCmd, 'start');
    else
        client_pump.publish(ptopicCmd, 'stop');
    }

function clean_connection()
    {
    if(p_connected)
        client_pump.end();
    }