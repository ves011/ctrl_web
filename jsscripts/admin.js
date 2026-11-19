
/**
 * 
 */
var nDevices = 0;
var c_connected = false;
var iot = {shortName: '', longName: '', ip: ''};
const iotList = []; 

function enumAllDevices()
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
    client.on('reconnect', function (data) {console.log('Reconnecting...')});
    client.on('close', function (data) {console.log('Disconnected')});
    client.on('disconnect', function (packet) {console.log(packet)});
    client.on('error', function (error){console.log(error)})
    client.on('message', function (topic, payload, packet) {processMessage(topic, payload, packet)});
    }
function processMessage(topic, payload, packet)
    {
    b = String.fromCharCode(...payload);
    b += '\1';
    console.log('Message from server ', topic + ': ' + b);
    params = b.split('\1')
    var x = document.getElementById("devTable");;
    switch(topic)
        {
        case 'gnetdev/response':
            const iot = {shortName: params[0], longName: params[1], id: params[2], ip: params[2], project: params[6], version: params[7], buildd: params[8], buildt: params[9]};
            for(i = 0; i < nDevices; i++)
                {
                if(iotList[i].shortName == iot.shortName)
                    break;
                }
            if(i == nDevices)
                {
                let insertAt = 1;
                while (insertAt < x.rows.length &&
                    x.rows[insertAt].cells[0].textContent.localeCompare(iot.shortName, undefined, { numeric: true, sensitivity: "base" }) <= 0) 
                    {
                    insertAt++;
                    }
                iotList[nDevices] = iot;
                var r = x.insertRow(insertAt);
                var shortName = r.insertCell(0);
                r.insertCell(1);
                var longName = r.insertCell(2);
                r.insertCell(3);
                var ip = r.insertCell(4);
                r.insertCell(5);
                var project = r.insertCell(6);
                r.insertCell(7);
                var version = r.insertCell(8);
                r.insertCell(9);
                var build = r.insertCell(10);
                r.insertCell(11);
                var linkcell = r.insertCell(12);
                shortName.innerHTML = iot.shortName;
                longName.innerHTML = iot.longName;
                ip.innerHTML = iot.ip;
                project.innerHTML = iot.project;
                version.innerHTML = iot.version;
                build.innerHTML = iot.buildd + " / " + iot.buildt;
                //w.innerHTML = "goto provisioning";

                const link = document.createElement("a");
                link.textContent = "provision";
                const params = new URLSearchParams(
                    {
                    ip: iot.ip,
                    id: iot.shortName
                    });
                link.href = `device_p.html?${params}`;
                link.target = "_blank";
                link.className = "provision-link";
                /*
                link.href = `http://${iot.ip}/`;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "provision-link";
                //link.removeAttribute("target");

                link.addEventListener("click", event => 
                    {
                    event.preventDefault();
                    // Send the MQTT command here.
                    if (c_connected) 
                        {
                        client.publish(`${iot.shortName}/ctrl`, "boot ota_1", { qos: 1 });
                        client.publish(`${iot.shortName}/ctrl`, "restart", { qos: 1 });
                        }
                    window.open(`http://${iot.ip}/`, "_blank");
                    });
                */
                linkcell.appendChild(link);
              
                nDevices++;
                }
            else
                {
                iotList[i] = iot;
                const row = Array.from(x.rows).slice(1).find(r => r.cells[0].textContent === iot.shortName);
                if (row) 
                    row.cells[4].textContent = iot.ip;
                }
            break;
        default:
            break;
        }
    }