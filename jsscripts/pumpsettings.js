var devName;
var fromMain;
var pstopicCmd;
var pstopicState;
var pstopicMonitor;
const devString = "Pompa Foraj";

var client_set;
var ps_connected = false;
function getPumpSettings()
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
    const urlParams = new URLSearchParams(location.search);
    devName = urlParams.get('id');
    fromMain = urlParams.get('fromMain');
    if(ps_connected)
        client_set.end();
    client_set  = mqtt.connect(url, options);
    client_set.on('connect', function (connack) 
        {
        ps_connected = true;
        client_set.subscribe('gnetdev');
        client_set.subscribe('$SYS/broker/clients/connected');
        });
    client_set.on('reconnect', function (data) {console.log('Reconnecting...')});
    client_set.on('close', function (data) {console.log('Disconnected')});
    client_set.on('disconnect', function (packet) {console.log(packet)});
    client_set.on('error', function (error){console.log(error)})
    client_set.on('message', function (topic, payload, packet) {processMessage(topic, payload, packet)});
    }
function processMessage(topic, payload, packet)
    {
    b = String.fromCharCode(...payload);
    console.log('Message from server ', topic + ': ' + b);
    params = b.split('\1');
    switch(topic)
        {
        case 'gnetdev':
            if(params[2] == devString)
                {
                devName = params[1];
                var topic = devName + '/';
                pstopicCmd = topic + 'cmd';
                pstopicState = topic + 'state';
                pstopicMonitor = topic + 'monitor';
                client_set.subscribe(pstopicState);
                client_set.subscribe(pstopicMonitor);
                client_set.publish(pstopicCmd, 'state');
                }
            break;
        case pstopicState:
            document.getElementById("minp").value = params[7];
            document.getElementById("maxp").value = params[8];
            document.getElementById("kpa0").value = params[6];
            document.getElementById("faultc").value = params[9];
            break;
        case pstopicMonitor:
            break;
        default:
            break;
        }
    }

function checkAndSave()
    {
    var minp = document.getElementById("minp").value;
    var maxp = document.getElementById("maxp").value;
    var faultc = document.getElementById("faultc").value;
    if(maxp > minp && faultc > 100)
        {
        client_set.publish(pstopicCmd, "set_limits " + minp + " " + maxp + " " + faultc + " 10" );
        client_set.publish(pstopicCmd, "state");
        }
    else
        alert("parametri invalizi\nP maxim > Pminim\nCurent de avarie > 100 mA");
    }

function setOffset()
    {
    if(confirm("Puneti instalatia la presiune 0\nPuneti pompa in OFFLINE si deschideti robinetii"))
        {
        client_set.publish(pstopicCmd, "set0");
        client_set.publish(pstopicCmd, "state");
        }
    }
function goToPump()
    {
    var location = "pump.html";
    if(fromMain == 1)
        location += "?ip=" + devIP + "&fromMain=1";
    window.location.assign(location);
    }

function clean_connection()
    {
    if(ps_connected)
        client_set.end();
    }