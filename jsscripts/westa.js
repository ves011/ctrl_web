var wdevName;
const devString = "Statia meteo";

var wtopicCmd;
var wtopicState;
var wtopicMonitor;

var w_connected = false;
var client_westa;
const fileData = [];
const temps = [];
const press = [];
const presns = [];
const hums = [];
const times = [];
const itus = [];
var idx = 0;
var requestdata = 0;
var mint, maxt, minp, maxp, minh, maxh, mini, maxi, maxtp, mintp;
var temperatureChart = null;
var pressureChart = null;
function getWestaClient()
    {
    //const url = 'ws://proxy.gnet/ws/'; 
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
        client_westa.end();
    client_westa  = mqtt.connect(url, options);
    client_westa.on('connect', function (connack) 
        {
        w_connected = true;
        client_westa.subscribe('gnetdev/response');
        client_westa.publish('gnetdev/query', 'reqID');
        });
    client_westa.on('reconnect', function (data) {console.log('Reconnecting...')});
    client_westa.on('close', function (data) {console.log('Disconnected')});
    client_westa.on('disconnect', function (packet) {console.log(packet)});
    client_westa.on('error', function (error){console.log(error)})
    client_westa.on('message', function (topic, payload, packet) {processMessage(topic, payload, packet)});
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
                if(params[0].indexOf("westa") >= 0)
                    wdevName = params[1];
                }
            if(params[1] == wdevName)
                {
                wdevName = params[1];
                var topic = params[0] + '/';
                wtopicCmd = topic + 'cmd';
                wtopicState = topic + 'state';
                wtopicMonitor = topic + 'monitor';
                client_westa.subscribe(wtopicState);
                client_westa.subscribe(wtopicMonitor);
                westaGetData();
                }
            break;
        case wtopicState:
            if(params[2].indexOf("WR ") == 0)
                {
                //get all the lines starting with "WR "
                fileData[idx] = params[2];
                data = params[2].split(' ');
                epd = new Date(data[1]);
                times[idx] = epd.getTime();
                //times[idx] = data[1];
                temps[idx] = data[2];
                press[idx] = data[3];
                presns[idx] = data[4];
                hums[idx] = data[5];
                itus[idx] = 0.81 * Number(temps[idx]) + 0.01 * Number(hums[idx]) * (0.99 * Number(temps[idx]) - 14.3) + 46.3;
                if(Number(temps[idx]) > maxt)
                    maxt = Number(temps[idx]);
                if(Number(temps[idx]) < mint)
                    mint = Number(temps[idx]);
                if(Number(press[idx]) > maxp)
                    maxp = Number(press[idx]);
                if(Number(press[idx]) < minp)
                    minp = Number(press[idx]);
                if(Number(hums[idx]) > maxh)
                    maxh = Number(hums[idx]);
                if(Number(hums[idx]) < minh)
                    minh = Number(hums[idx]);
                if(Number(itus[idx]) > maxi)
                    maxi = Number(itus[idx]);
                if(Number(itus[idx]) < mini)
                    mini = Number(itus[idx]);
                maxtp = (maxh > maxi)?maxh:maxi;
                mintp = (minh < mini)?minh:mini;
                idx++;
                }
            else if(params[2].indexOf("WRS") == 0)
                {
                //summary 
                summary = params[2].split(' ');
                if(summary[2] == idx)
                    {
                    if(Number(presns[0]) > maxp)
                        maxp = Number(presns[0]);
                    else if(Number(presns[0]) < minp)
                        minp = Number(presns[0]);
                    //draw the plot
                    const date = new Date(times[idx - 1]);
                    const formattedDate = date.toLocaleString("en-GB", 
                        {
                        day: "numeric",
                        month: "short",
//                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                        });
                    document.getElementById("ctime").innerHTML = formattedDate + ':';
                    document.getElementById("ctemp").innerHTML = Number(temps[idx - 1]).toFixed(1) + ' °C ';
                    document.getElementById("cpres").innerHTML = Number(press[idx - 1]).toFixed(1) + ' mBar ';
                    document.getElementById("chum").innerHTML = Number(hums[idx - 1]).toFixed(1) + ' % ';
                    if(requestdata == 1)
                        {
                        plotTemp();
                        plotPres();
                        requestdata = 0;
                        }
                    }
                }
/*
            else if(params[2].indexOf("BMP") == 0)
                {
                epd = new Date(params[0]);
                const formattedDate = epd.toLocaleString("en-GB", 
                    {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit"
                    });
                document.getElementById("ctime").innerHTML = formattedDate + ':';
                document.getElementById("ctemp").innerHTML = Number(params[3]).toFixed(1) + ' °C ';
                document.getElementById("cpres").innerHTML = Number(params[4]).toFixed(1) + ' mBar ';
                } */
            break;
        case wtopicMonitor:
            if(params[2].indexOf("BMPDHT") == 0)
                {
                epd = new Date(params[0]);
                const formattedDate = epd.toLocaleString("en-GB", 
                    {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit"
                    });
                document.getElementById("ctime").innerHTML = formattedDate + ':';
                document.getElementById("ctemp").innerHTML = Number(params[3]).toFixed(1) + ' °C ';
                document.getElementById("cpres").innerHTML = Number(params[4]).toFixed(1) + ' mBar ';
                document.getElementById("chum").innerHTML = Number(params[6]).toFixed(1) + ' % ';
                }
            break;
        default:
            break;
        }
    }
//ITU = 0,81 x T + 0,01 x U x (0,99 x T – 14,3) + 46,3
//ITU = (T * 1,8 + 32) - (0,55 - 0,0055 * H)[(T * 1,8 + 32) - 58]
function plotTemp()
    {
    const ctx = document.getElementById('tempChart');
    const config = {
    type: "line",
    stacked: true,
    data: {
        labels: times,
        datasets: [
            {
            data: temps, // Set initially to empty data
            label: "Temperatura",
            borderColor: "#3e95cd",
            fill: false,
            lineTension: 0.4,  
            yAxisID: "y"
            },
            {
            data: itus, // Set initially to empty data
            label: "ITU",
            borderColor: "#f379e9",
            fill: false,
            lineTension: 0.4,  
            yAxisID: "y1"
            },
            {
            data: hums, // Set initially to empty data
            label: "Umiditate",
            borderColor: "#92f88e",
            fill: false,
            lineTension: 0.4,  
            yAxisID: "y1"
            }
            ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins:
            {
            legend: 
                {
                labels: 
                    {
                    boxHeight: 1,
                    font: {Family: "'Verdana', sans-serif", size: 16, weight: "bold"}
                    }
                }
            },
        scales: 
            {
            x: 
                {
                type: "time",
                border:{display: true, width: 3, color: '#000'},
                grid: {display: true},
                ticks:{autoskip: true},
                time: 
                    {
                    unit: "hour",
                    displayFormats: {"hour": "MMM-dd HH:mm"}
                    }
                },
            y: 
                {
                border:{display: true, width: 3, color: '#000'},
                grid: {display: true},
                title: {display: true, text: "deg C", font: {weight: "bold"}},
                position: "left",
                suggestedMax: maxt + 5 ,
                suggestedMin: mint - 5,
                ticks:
                    {
                    callback: function(value, index, ticks) 
                        {
                        return Number(value).toFixed(2);
                        }
                    }
                },
            y1:
                {
                border:{display: true, width: 3, color: '#000'},
                position: 'right',
                title: {display: true, text: "%", font: {size: 14, weight: "bold"}},
                grid: {drawOnChartArea: false}, // only want the grid lines for one axis to show up
                suggestedMax: maxtp + 5 ,
                suggestedMin: mintp - 5
                }
            }
        }
    };
    if(temperatureChart)
        temperatureChart.destroy();
    temperatureChart = new Chart(ctx, config);
    }

function plotPres()
    {
    const ctx = document.getElementById('presChart');
    const config = {
    type: "line",
    stacked: false,
    data: {
        labels: times,
        datasets: [
            {
            data: press, // Set initially to empty data
            label: "Presiunea atmosferica",
            borderColor: "#dd8800",
            fill: false
            },
            {
            data: presns, // Set initially to empty data
            label: "Presiunea atmosferica normala",
            borderColor: "#46c1fa",
            fill: false,
            pointRadius: 1,
            pointHoverRadius: 1
            }
            ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins:
            {
            legend: 
                {
                labels: 
                    {
                    boxHeight: 1,
                    font: {Family: "'Verdana', sans-serif", size: 16, weight: "bold"}
                    }
                }
            },
        scales: 
            {
            x: 
                {
                type: "time",
                border:{display: true, width: 3, color: '#000'},
                grid: {display: true},
                ticks:{autoskip: true},
                time: 
                    {
                    unit: "hour",
                    displayFormats: {"hour": "MMM-dd HH:mm"}
                    }
                },
            y: 
                {
                border:{display: true, width: 3, color: '#000'},
                grid: {display: true},
                title: {display: true, text: "mBar", font: {weight: "bold"}},
                suggestedMax: maxp + 5,
                suggestedMin: minp - 5
                },
            y1:
                {
                border:{display: true, width: 3, color: '#fff'},
                position: 'right',
                title: {display: true, text: "  ", font: {size: 14, weight: "bold"}},
                grid: {drawOnChartArea: false}, // only want the grid lines for one axis to show up
                suggestedMax: maxtp + 5 ,
                suggestedMin: mintp - 5,
                ticks:{color: '#fff'}
                }
            }
        }
    };
    if(pressureChart)
        pressureChart.destroy();
    pressureChart = new Chart(ctx, config);
    }

function enableTime()
    {
    westaGetData();
    }
function enableInt()
    {
    }
function setTimeHistory()
    {
    westaGetData();
    }

function westaGetData()
    {
    var t = document.querySelector('input[name="history"]:checked').value;
    if(t == 'tsel')
        {
        var date = new Date();
        var sel = document.getElementById("timeScale").value;
        switch (sel)
            {
            case 'h12':
                date.setHours(date.getHours() - 12);
                break;
            case 'h24':
                date.setHours(date.getHours() - 24);
                break;
            case 'h48':
                date.setHours(date.getHours() - 48);
                break;
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'm1':
                date.setMonth(date.getMonth() - 1);
                break;
            case 'm3':
                date.setMonth(date.getMonth() - 3);
                break;
            case 'y1':
                date.setMonth(date.getMonth() - 12);
                break;
            default:
                break;
            }
        var datestring = (date.getFullYear()) + "-" + ("0"+(date.getMonth()+1)).slice(-2) + "-" +
                      ("0"+(date.getDate())).slice(-2) + "T" + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
        console.log(datestring);
        idx = 0;
        mint = minp = minh = mini = 10000;
        maxt = maxp = maxh = maxi = 0;
        temps.length = press.length = hums.length = presns.length = itus.length = times.length = 0;
        client_westa.publish(wtopicCmd, 'range ' + datestring);
        requestdata = 1;
        }
    else if(t == 'intsel')
        {
        }
    }