const dstring = "... se deschide";
const istring = "... se inchide";
var idx, monTimer;

var gdevName;
const gdevString = "Poarta Auto";
var gtopicCmd;
var gtopicState;
var gtopicMonitor;

var gclient; 
var g_connected;

const STEADY_STATE = 1;
const MOVING_STATE = 2;
const STATE_CLOSED = 3;
const STATE_OPEN = 2;
const STATE_OPENP = 1;
const CMD_CLOSE = 1;
const CMD_OPEN = 0;
const CMD_COMPLETE = 2;

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
                if(params[0].indexOf("gate") >= 0)
                    gdevName = params[1];
                }
            if(params[1] == gdevName)
                {
                gdevName = params[1];
                var topic = params[0] + '/';
                gtopicCmd = topic + 'cmd';
                gtopicState = topic + 'state';
                gtopicMonitor = topic + 'monitor';
                gclient.subscribe(gtopicState);
                gclient.subscribe(gtopicMonitor);
                gclient.publish(gtopicCmd, 'state');
                }
            break;
        case gtopicState:
            updateState(params[2], params[3], params[5]);
            break;
        default:
            break;
        }
    }

function openGate()
    {
    gclient.publish(gtopicCmd, "open");
    }
function closeGate()
    {
    gclient.publish(gtopicCmd, "close");
    }

function updateState(state, movings, cmd_state)
    {
    if(movings == STEADY_STATE)
        {
        clearInterval(monTimer);
        if(state == STATE_CLOSED)
            {
            document.getElementById("progress").innerHTML = "inchisa";
            document.getElementById("bclose").className = "button button-posclose button_disabled";
            document.getElementById("bopen").className = "button button-posopen button_enabled";
            document.getElementById("bclose").innerHTML = "Inchide";
            document.getElementById("bopen").innerHTML = "Deschide";
            }
        else if(state == STATE_OPEN)
            {
            document.getElementById("progress").innerHTML = "deschisa";
            document.getElementById("bclose").className = "button button-posclose button_enabled";
            document.getElementById("bopen").className = "button button-posopen button_disabled";
            document.getElementById("bclose").innerHTML = "Inchide";
            document.getElementById("bopen").innerHTML = "Deschide";
            }
        else if(state == STATE_OPENP)
            {
            document.getElementById("progress").innerHTML = "deschisa partial";
            document.getElementById("bclose").className = "button button-posclose button_enabled";
            document.getElementById("bopen").className = "button button-posopen button_enabled";
            document.getElementById("bclose").innerHTML = "Inchide";
            document.getElementById("bopen").innerHTML = "Deschide";
            }
        }
    else if(movings == MOVING_STATE)
        {
        if(cmd_state == CMD_CLOSE)
            {
            document.getElementById("bclose").innerHTML = "Stop";
            document.getElementById("bopen").className = "button button-posopen button_disabled";
            }
        else if(cmd_state == CMD_OPEN)
            {
            document.getElementById("bopen").innerHTML = "Stop";
            document.getElementById("bclose").className = "button button-posclose button_disabled";
            }
                
        idx = 0;
        monTimer = setInterval(showProgress, 1000, cmd_state);
        }
    }

function showProgress(cmd)
    {
    console.log(idx);
    if(cmd == CMD_OPEN)
        {
        document.getElementById("progress").innerHTML = rotate(dstring, dstring.length - idx);
        idx = (idx + 1) % dstring.length;
        }
    else if(cmd == CMD_CLOSE)
        {
        document.getElementById("progress").innerHTML = rotate(istring, idx);
        idx = (idx + 1) % istring.length;
        }
    else
        {
        }
    }

function rotate(text, noOfChars = 0)
    {
    const n = noOfChars % text.length;
    const part1 = text.slice(0, n);
    const part2 = text.slice(n);
    return `${part2}${part1}`;
    }

function clean_connection()
    {
    if(g_connected)
        gclient.end();
    }