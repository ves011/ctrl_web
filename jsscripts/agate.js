var gdevName;
const gdevString = "Poarta Auto";
var gtopicCmd;
var gtopicState;
var gtopicMonitor;
var gtopicCtrl;

var gclient; 
var g_connected;
var devip;
var gate_state;
var moving_state;
var cmd_sel;

const STEADY_STATE = 1;
const MOVING_STATE = 2;
const OPEN_IN_PROGRESS = 3;
const CLOSE_IN_PROGRESS = 4;
const STATE_CLOSED = 3;
const STATE_OPEN = 2;
const STATE_OPENP = 1;
const CMD_FULL = 1;
const CMD_PED = 2;

function getGateClient()
    {
    const gurl = 'wss://proxy.gnet/wss/';
    const goptions = 
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
    //document.getElementById('openped-input').addEventListener("change", toogleBGColor(), false);
    document.getElementById("openped-input").disabled = true;
    document.getElementById("openfull-input").disabled = true;
    document.getElementById('openped-input').addEventListener("change", 
        function()
            {
            if(this.checked) 
                document.getElementById("openped").style.backgroundColor = "#2196F3";
            else 
                document.getElementById("openped").style.backgroundColor = "#ccc";
            }, false);
    document.getElementById('openfull-input').addEventListener("change", 
        function()
            {
            if(this.checked) 
                document.getElementById("openfull").style.backgroundColor = "#2196F3";
            else 
                document.getElementById("openfull").style.backgroundColor = "#ccc";
            }, false);
    
    // disable both sliders
    setSliders(0, 0);
    gdevName = '';
    if(g_connected)
        gclient.end();
    gclient  = mqtt.connect(gurl, goptions);
    gclient.on('connect', function (connack) 
        {
        g_connected = true;
        gclient.subscribe('gnetdev/response');
        gclient.publish('gnetdev/query', 'reqID');
        });
    gclient.on('reconnect', function (data) {console.log('Reconnecting...')});
    gclient.on('close', function (data) {console.log('Disconnected')});
    gclient.on('disconnect', function (packet) {console.log(packet)});
    gclient.on('error', function (error){console.log(error)})
    gclient.on('message', function (topic, payload, packet) {processMessage(topic, payload, packet)});
    }
function processMessage(topic, payload, packet)
    {
    b = String.fromCharCode(...payload);
    console.log('Message from server ', topic + ': ' + b);
    params = b.split('\1');
    switch(topic)
        {
        case 'gnetdev/response':
            if(gdevName == '')
                {
                if(params[0].indexOf("gate") >= 0 && params[2] == devip)
                    gdevName = params[0];
                }
            if(params[0] == gdevName)
                {
                gdevName = params[1];
                var topic = params[0] + '/';
                gtopicCmd = topic + 'cmd';
                gtopicState = topic + 'state';
                gtopicMonitor = topic + 'monitor';
                gtopicCtrl = topic + 'ctrl';
                gclient.subscribe(gtopicState);
                gclient.subscribe(gtopicMonitor);
                gclient.publish(gtopicCmd, 'state');
                //runScript();
                }
            break;
        case gtopicState:
        case gtopicMonitor:
            gate_state = params[2];
            moving_state = params[3];
            setSliders();
            break;
        default:
            break;
        }
    }

function openfullClick()
    {
    cmd_sel = 0;
    if(moving_state == STEADY_STATE)
        {
        if(gate_state == STATE_OPEN)
            {
            gclient.publish(gtopicCmd, "close");
            cmd_sel = CMD_FULL;
            }
        else
            {
            gclient.publish(gtopicCmd, "open");
            cmd_sel = CMD_FULL;
            }
        }
    else
        {
        gclient.publish(gtopicCmd, "open");
        cmd_sel = CMD_FULL;
        }
    }
function openpedClick()
    {
    if(cmd_sel == CMD_PED && moving_state == STEADY_STATE && gate_state == STATE_OPEN)
        {
        gclient.publish(gtopicCmd, "close");
        }
    else
        {
        cmd_sel = 0;
        if(moving_state == STEADY_STATE && gate_state == STATE_CLOSED)
            {
            gclient.publish(gtopicCmd, "openped");
            cmd_sel = CMD_PED;
            }
        else
            document.getElementById("openped-input").checked = false;
        }
    }

function clean_connection()
    {
    if(g_connected)
        gclient.end();
    }

function setSliders()
    {
    if(moving_state == STEADY_STATE)
        {
        if(gate_state == 0) //switch disabled
            {
            document.getElementById("openped-input").disabled = true;
            //document.getElementById("openped").style.backgroundColor = "#ccc";
            document.getElementById("openfull-input").disabled = true;
            //document.getElementById("openfull").style.backgroundColor = "#ccc";
            }
        else if(gate_state == STATE_CLOSED) //gate closed
            {
            document.getElementById("openped-input").disabled = false;
            document.getElementById("openped-input").checked = false;
            document.getElementById("openped").style.backgroundColor = "#ccc";
            document.getElementById("openfull-input").disabled = false;
            document.getElementById("openfull-input").checked = false;
            document.getElementById("openfull").style.backgroundColor = "#ccc";
            }
        else if(gate_state == STATE_OPEN) //gate open
            {
            document.getElementById("openped-input").disabled = false;
            document.getElementById("openfull-input").disabled = false;
            document.getElementById("openped-input").checked = true;
            document.getElementById("openfull-input").checked = true;
            document.getElementById("openfull").style.backgroundColor = "#2196F3";
            document.getElementById("openped").style.backgroundColor = "#2196F3";
            }
        }
    else if(moving_state == MOVING_STATE || moving_state == OPEN_IN_PROGRESS || moving_state == CLOSE_IN_PROGRESS)
        {
        var ssel = null;
        if(cmd_sel == CMD_PED)
            var ssel = document.getElementById("openped");
        else if(cmd_sel == CMD_FULL)
            var ssel = document.getElementById("openfull");
        if(ssel)
            {
            if(ssel.style.backgroundColor == "rgb(33, 150, 243)")
                ssel.style.backgroundColor = "#ccc";
            else
                ssel.style.backgroundColor = "#2196F3";
            }
        }
    }

