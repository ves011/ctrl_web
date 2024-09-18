let zone = -1;
var phist = [{dv: 0, no: 0, qwater: 0, start: "", stop: "", cs: 0, fault: 0}];
var phist_entries = 0;
var t_edit = -1, s_edit = 0;
var zone_idx = -1;
var devip;
function zoneInit()
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
    const pparams = new URLSearchParams(document.location.search);
    devip = pparams.get("ip");
    const queryString = document.location.search;
    const urlParams = new URLSearchParams(queryString);
    zone = parseInt(urlParams.get('dzone'));
    devip = urlParams.get('ip');
    var t = document.getElementById("hdiv");
    z = zone + 1;
    t.firstChild.textContent = "Zona de irigatie " + z;
	
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
    client_pump.on('message', function (topic, payload, packet) {processZMessage(topic, payload, packet)});
    }
function processZMessage(topic, payload, packet)
    {
    b = String.fromCharCode(...payload);
    //console.log('Message from server ', topic + ': ' + b);
    params = b.split('\x01');
    switch(topic)
		{
		case 'gnetdev/response':
            if(pdevName == '')
                {
                if(params[0].indexOf("wp") >= 0 && devip == params[2])
                    pdevName = params[1];
                }
            if(params[1] == pdevName && devip == params[2])
                {
                pdevName = params[1];
                var topic = params[0] + '/';
                ptopicCmd = topic + 'cmd';
                ptopicState = topic + 'state';
                ptopicMonitor = topic + 'monitor';
                ptopicState_a = topic + 'state' + '/w';
                ptopicMonitor_a = topic + 'monitor' + '/w';
                client_pump.subscribe(ptopicState);
                client_pump.subscribe(ptopicMonitor);
                client_pump.subscribe(ptopicState_a);
                client_pump.subscribe(ptopicMonitor_a);
                client_pump.publish(ptopicCmd, 'dv state');
                client_pump.publish(ptopicCmd, 'dv program');
                client_pump.publish(ptopicCmd, 'dv readps');
                }
            break;
		case ptopicState_a:
			switch(params[2])
                {
                case 'state':
					k = 6;
					for(i = 0; i < DVCOUNT; i ++)
                        {
                        dv_status[i] = {dv_no: params[k++], dv_state: params[k++]};
                        if(dv_status[i].dv_no == zone)
                            {
                            bs = document.getElementById("btap");
                            if(dv_status[i].dv_state == 1)
                                {
                                bs.innerHTML = "Inchide";
                                bs.className = "button button-postap button_enabled button_offline";
                                }
                            else 
                                {
                                bs.innerHTML = "Deschide";
                                bs.className = "button button-postap button_enabled button_online";
                                }
                            }
                       }
					break;
                case 'program':
                    k = 3;
                    for(i = 0; i < DVCOUNT * wpday; i++)
                        {
                        dv_program[i] = {dv_no: params[k++], no: params[k++], 
                            starth: params[k++], startm: params[k++], stoph: params[k++], stopm: params[k++], 
                            qwater: params[k++], cs: params[k++], fault: params[k++]};
                        if(dv_program[i].dv_no == zone)
                            {
                            var tm_start = FormatTime(dv_program[i].starth, dv_program[i].startm);
                            var tm_stop = FormatTime(dv_program[i].stoph, dv_program[i].stopm);
                            document.getElementById("dv_start" + dv_program[i].no).value = tm_start;
                            document.getElementById("dv_stop" + dv_program[i].no).value = tm_stop;
                            if(dv_program[i].cs == 0)
                                dt = "ACT-0";
                            else if(dv_program[i].cs == 1)
                                dt = "Activ";
                            else if(dv_program[i].cs  == 2)
                                dt = "OK-0";
                            else if(dv_program[i].cs  >= 3 && dv_program[i].cs  <= 5)
                                dt = "NOK-" + dv_program[i].fault;
                            else if(dv_program[i].cs  >= 3 && dv_program[i].cs  == 6)
                                dt = "ERR";
                            else
                                dt = "N/A";
                            document.getElementById("reset_p" + dv_program[i].no).innerHTML = dt;
                            if(dv_program[i].cs == 7)
                                {
                                if(dv_program[i].no == 0)
                                    {
                                    document.getElementById("reset_p" + (parseInt(dv_program[i].no) + 1)).className = "bsave button_disabled";
                                    }
                                }
                            }
                        }
                    t_edit = -1;
                    s_edit = 0;
                    document.getElementById("save_p0").className = "bsave button_disabled";
                    break;
				case 'phist':
                    if(params[3] == 'start')
                        {
                        phist_entries = 0;
                        phist.length = 0;
                        var to = document.getElementById("thist");
                        while((nrows = to.rows.length) > 0)
                            to.deleteRow(-1);
                        document.getElementById("hstate").innerHTML = '(incomplet)';
                        }
                    else if(params[3] == 'prog')
                        {
                        phist.push({dv: params[4], no: params[5], qwater: params[6], start: params[7], stop: params[8], cs: params[9], fault: params[10]});
                        if(phist[phist_entries].stop[phist[phist_entries].stop.length -1] ==',')
                            phist[phist_entries].stop = phist[phist_entries].stop.substring(0, phist[phist_entries].stop.length -1);
                        addHistLine(phist_entries);
                        phist_entries++;
                        }
                    else if(params[3] == 'end')
                        {
                        document.getElementById("hstate").innerHTML = '';
                        }
                    break;
                }
			break;
		case ptopicMonitor_a:
            switch(params[2])
                {
                case 'dvop':
                    if(params[3] == zone)
                        {
                        if(document.getElementById("btap").className.indexOf("button_online") >= 0)
                            document.getElementById("btap").className = "button button-postap button_enabled button_offline";
                        else
                            document.getElementById("btap").className = "button button-postap button_enabled button_online";
                        }
                    break;
                case 'dvstate':
                    if(params[3] == zone)
                        {
                        if(params[4] == 1)
                            {
                            document.getElementById("btap").innerHTML = "Inchide";
                            document.getElementById("btap").className = "button button-postap button_enabled button_offline";
                            }
                        else
                            {
                            document.getElementById("btap").innerHTML = "Deschide";
                            document.getElementById("btap").className = "button button-postap button_enabled button_online";
                            }
                        }
                    break;
                }
			break;
		}
	}
function addHistLine(hrow)
    {
    if(phist[hrow].dv == zone)
        {
        var to = document.getElementById("thist");
        var x = to.insertRow(0);
        var y = x.insertCell(0);
        y.style.width = '20px';
        y.innerHTML = 'p' + (parseInt(phist[hrow].no) + 1);
        y = x.insertCell(1);
        y.style.width = '140px';
        var dt = phist[hrow].start.substring(0, 10);
        dt += ' ' + phist[hrow].start.substring(11, 16);
        y.innerHTML = dt;
        y = x.insertCell(2);
        y.style.width = '140px';
        dt = phist[hrow].stop.substring(0, 10);
        dt += ' ' + phist[hrow].stop.substring(11, 16);
        y.innerHTML = dt;
        y = x.insertCell(3);
        y.style.width = '50px';
        y.innerHTML = phist[hrow].qwater;
        y = x.insertCell(4);
        y.style.width = '55px';
        if(phist[hrow].cs < 2)
            dt = "ACT-0";
        else if(phist[hrow].cs == 2)
            dt = "OK-0";
        if(phist[hrow].cs >= 3 && phist[hrow].cs <= 6)
            dt = "NOK-" + phist[hrow].fault;
        y.innerHTML = dt;
        }
    }

function FormatTime(h, m)
    {
    var tf;
    if(h < 10)
        tf = "0" + h + ":";
    else
        tf = h+":";
    if(m < 10)
        tf += "0" + m;
    else
        tf += m;
    return tf;    
    }
function resetProg(no)
    {
    bt = document.getElementById("reset_p" + no);
    for(i = 0; i < DVCOUNT * wpday; i++)
        {
        if(dv_program[i].dv_no == zone && dv_program[i].no == no)
            {
            new_cs = dv_program[i].cs;
            if(dv_program[i].cs == 0) // program reset 
                new_cs = 7; // it goes to skip
            else if(dv_program[i].cs == 1)
                alert("Starea nu poate fi schimbata cand udarea este activa");
            else if(dv_program[i].cs == 6)
                {
                if(dv_program[i].start >= dv_program[i].stop)
                    alert("Valori invalide pentru inceput si sfarsit de program");
                else
                    new_cs = 0;
                }
            else
                new_cs = 0;
            if(new_cs != 7 && dv_program[i].start >= dv_program[i].stop)
                {
                alert("Timpul de incepere trebuie sa fie inaintea timpului de oprire\nProgramul nu poate fi validat");
                if(dv_program[i].cs == 7)
                    new_cs = 7;
                else 
                    new_cs = 6;
                }
            if(new_cs != dv_program[i].cs)
                {
                if(new_cs == 7)
                    {
                    document.getElementById("reset_p" + no).innerHTML = "N/A";
                    if(no == 0)
                        document.getElementById("reset_p" + (parseInt(no) + 1)).className = "bsave button_disabled";
                    //client_pump.publish(ptopicCmd, 'dv wpday' + dv_program[i].dv_no + ' ' + parseInt(no));
                    }
                else
                    {
                    document.getElementById("reset_p" + no).innerHTML = "ACT-0";
                    if(no == 0)
                        document.getElementById("reset_p" + (parseInt(no) + 1)).className = "bsave button_enabled";
                    }
                dv_program[i].cs = new_cs;
                s_edit = 1;
                document.getElementById("save_p0").className = "bsave button_enabled";
                }
            break;
            }
        }    
    }
function timeEdit(ss, prog_no)
    {
    t_edit = -1;
    vedit = document.getElementById("dv_" + ss + prog_no).value;
    sth = vedit.substring(0, 2);
    stm = vedit.substring(3, 5);
    for(i = 0; i < DVCOUNT * wpday; i++)
        {
        if(dv_program[i].dv_no == zone && dv_program[i].no == prog_no)
            {
            if(ss == 'start')
                {
                if(dv_program[i].starth != sth || dv_program[i].startm != stm)
                    {
                    t_edit = prog_no;
                    dv_program[i].starth = sth;
                    dv_program[i].startm = stm;
                    }
                }
            else
                {
                if(dv_program[i].stoph != sth || dv_program[i].stopm != stm)
                    {
                    t_edit = prog_no;
                    dv_program[i].stoph = sth;
                    dv_program[i].stopm = stm;
                    }
                }
            break;
            }
        }
    if(t_edit != -1)
        document.getElementById("save_p0").className = "bsave button_enabled";
    }

function saveProg()
    {
    var str2publish = "";
    if(t_edit != -1)
        {
        for(i = 0; i < DVCOUNT * wpday; i++)
            {
            if(dv_program[i].dv_no == zone && dv_program[i].no == t_edit)
                {
                var str2publish = "dv program " + zone + " " + dv_program[i].no + " " + 
                        dv_program[i].starth + ":" + dv_program[i].startm + " " + 
                        dv_program[i].stoph + ":" + dv_program[i].stopm + " 0";
                client_pump.publish(ptopicCmd, str2publish);
                }
            }
        }
    if(s_edit == 1)
        {
        wpd = 0;
        for(i = 0; i < DVCOUNT * wpday; i++)
            {
            if(dv_program[i].dv_no == zone)
                if(dv_program[i].cs != 7)
                    wpd++;
            }
        str2publish = "dv wpday " + zone + " " + wpd;
        client_pump.publish(ptopicCmd, str2publish,); 
        }
    if(s_edit == 1 || t_edit != -1)
        client_pump.publish(ptopicCmd, "dv program");
    }
function open_close()
    {
    var strPub = "";
    bs = document.getElementById("btap");
    if(bs.innerHTML == "Inchide")
        strPub = "dv close " + zone;
    else if(bs.innerHTML == "Deschide")
        strPub = "dv open " + zone;
    if(strPub != "")
        client_pump.publish(ptopicCmd, strPub);
    }
function goBack()
    {
    location.href='./wp.html' + "?ip=" + devip;
    }
