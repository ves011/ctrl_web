/**
 * 
 */
var nDevices = 0;
var c_connected = false;
var iot = {shortName: '', longName: '', ip: ''};
const iotList = []; 

function enumDevices()
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
    var x = document.getElementById("devTable");
    while((nrows = x.rows.length) > 1)
        x.deleteRow(-1);
    nDevices = 0;
    if(c_connected)
        client.end();
    //
    //------------------------------------
    client  = mqtt.connect(url, options);
    client.on('connect', function (connack) 
        {
        client.subscribe('gnetdev/response');
        client.subscribe('$SYS/broker/clients/connected');
        client.publish('gnetdev/query', 'reqID', { qos: 1, retain: false });
        c_connected = true;
        });
    client.on('reconnect', function (data) 
    {console.log('Reconnecting...')}
);
    client.on('close', function (data) 
    {console.log('Disconnected')}
);
    client.on('disconnect', function (packet) 
    {console.log(packet)}
);
    client.on('error', function (error){console.log(error)})
    client.on('message', function (topic, payload, packet) {processMessage(topic, payload, packet)});
    }
function processMessage(topic, payload, packet)
    {
    b = String.fromCharCode(...payload);
    console.log('Message from server ', topic + ': ' + b);
    params = b.split('\1')
    var x = document.getElementById("devTable");;
    switch(topic)
        {
        case 'gnetdev/response':
            const iot = {shortName: params[0], longName: params[1], ip: params[2]};
            for(i = 0; i < nDevices; i++)
                {
                if(iotList[i].shortName == iot.shortName)
                    break;
                }
            if(i == nDevices)
                {
                iotList[nDevices] = iot;
                var str = '<a href = "pages/'
                var strdest ="";
                if(iot.shortName.indexOf("gate") >= 0)
                    strdest = 'agate.html';
                else if(iot.shortName.indexOf("pump") >= 0)
                    strdest = 'pump.html';
                else if(iot.shortName.indexOf("westa") >= 0)
                    strdest = 'westa.html';
                else if(iot.shortName.indexOf("water") >= 0)
                    strdest = 'water.html';
                else if(iot.shortName.indexOf("wp") >= 0)
                    strdest = 'wp.html';
                if(strdest != "");
                    {
                    str += strdest;  
                    str += "?ip=";
                    str += params[2];                  
                    str += '">'
                    str += '<b>' + iot.longName + '</b></a>';
                    var r = x.insertRow(-1);
                    var y = r.insertCell(0);
                    var y = r.insertCell(1);
                    var z = r.insertCell(2);
                    y.innerHTML = str;
                    z.innerHTML = iot.ip;
                    nDevices++;
                    }
                }
            else
                {
                x.rows[i + 1].cells[2].innerHTML = iot.ip;
                }
            break;
        default:
            break;
        }
    }