/**
 * 
 */
var nDevices = 0;
var c_connected = false;

var iot = {shortName: '', longName: '', ip: ''};
const iotList = []; 


 function GetDevicesResponse(data)
    {
    console.log('Message from server ', data);
    //parse string data
    var paramr = data.split('\1');
    switch(paramr[0])
        {
        case '255':			//enum response
            i = 1;
            nDevices = 0;
            while(paramr[i] != '\3')
                {
                var paramd = paramr[i].split('\2');
                devStr[nDevices] = paramd[0];
                devIP[nDevices] = paramd[1];
                devID[nDevices] = paramd[2];
                i++;
                nDevices++;
                }
            displayDevices(1);
            break;
        case  '23':
            for(i = 0; i < nDevices; i++)
                {
                if(paramr[1] == devID[i])
                    break;
                }
            if(i < nDevices)
                {
                var stralert = devStr[i] + "\n";
                stralert += "\n" + paramr[3];
                stralert += "\n" + paramr[2];
                }
            else
                var stralert = "response ID: " + paramr[0] + "was not requested by any device";
            alert(stralert);
            break;
        case 'deadenum':
            displayDevices(0);
            break;
        case 'deadinfo':
            displayDevices(0);
            break;
        case 'write failed':
            alert("write failed");
            break;
        default:
            break;
        }
    }
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
    client  = mqtt.connect(url, options);
    client.on('connect', function (connack) 
        {
        client.subscribe('gnetdev/response');
        client.subscribe('$SYS/broker/clients/connected');
        client.publish('gnetdev/query', 'reqID', { qos: 1, retain: false });
        c_connected = true;
        });
    client.on('reconnect', function (data) {console.log('Reconnecting...')});
    client.on('close', function (data) {console.log('Disconnected')});
    client.on('disconnect', function (packet) {console.log(packet)});
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
                if(strdest != "");
                    {
                    str += strdest;                    
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
/*
 function deviceGetInfo(idx)
    {
    var data = "action=info&param=" + devID[idx];
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "php/dev.php", true);
    xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhttp.onreadystatechange = function()
        {
        if (this.readyState == 4 && this.status == 200) 
            {
            var resp = this.responseText;
            GetDevicesResponse(resp);
            }
        }
    xhttp.send(data);
    }
function displayDevices(how)
    {
    var x = document.getElementById("devTable");
    while((nrows = x.rows.length) > 1)
        x.deleteRow(-1);
    if(how == 1)
        {
        for(i = 0; i < nDevices; i++)
            {
            var r = x.insertRow(-1);
            var y = r.insertCell(0);
            //y.innerHTML = '<a id = "link" title = "Device info" href = "#" onClick = "deviceGetInfo(\''+i+'\'); return false;"> <img src="res/info.jpg" height="50px" width="auto"> </a>';
            y.innerHTML = '<binfo id = "info" class = "binfo active" onclick = "deviceGetInfo(\''+i+'\'); return false;"></binfo>';
            var y = r.insertCell(1);
            var z = r.insertCell(2);
            var str = '<a href = "pages/'
            if(devStr[i].indexOf("Poarta") >= 0)
                str += 'agate.html?ip=';
            else if(devStr[i].indexOf("Pompa") >= 0)
                str += 'pump.html?ip=';
            else
                str += 'unknown.html?ip=';
            str += devIP[i];
            str += '">'
            str += '<b>' + devStr[i] + '</b></a>';
            y.innerHTML = str;
            z.innerHTML = devIP[i];
            }
        }
    else
        {
        var r = x.insertRow(-1);
        var y = r.insertCell(0);
        var y = r.insertCell(1);
        var z = r.insertCell(2);
        y.innerHTML = "Communication error";
        z.innerHTML = "Control proxy is not reachable";
        }
    }
function getGateParams()
    {
    const urlParams = new URLSearchParams(location.search);//strParams);
    selectedDevIP = urlParams.get('ip');
    setParams(selectedDevIP);
    }
function getPumpParams()
    {
    //const urlParams = new URLSearchParams(location.search);//strParams);
    //selectedDevIP = urlParams.get('ip');
    setPumpParams(selectedDevIP);
    }
    */