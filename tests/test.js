// SPDX-License-Identifier: MIT
// Node.js parser/request-logic tests. These do not run Qt/Plasma or USB hardware.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
function moduleFrom(file) {
    const context = vm.createContext({});
    vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8').replace(/^\.pragma library\s*/, ''), context);
    return context;
}
const Hub = moduleFrom('contents/code/Hub.js');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS: ' + name); }
function device(fields) { return JSON.stringify({code: 200, status: 0, device: fields}); }
const serial = 'TEST_HEADSET_SERIAL'; // Synthetic; never publish real device serials.
const list = device({
    [serial]: {Product: 'VIRTUOSO XT', Serial: serial, Hidden: false},
    receiver: {Product: 'HEADSET DONGLE', Serial: 'receiver', Hidden: true},
    psu: {Product: 'HX1200i', Serial: 'psu', Hidden: false}
});
const live = (level, mute=0) => device({Connected:true,MuteStatus:mute,BatteryLevel:level,Usb:false});
test('discovers actual headset, excluding receiver and PSU', () => assert.equal(Hub.discover(list).serial, serial));
test('absence is not connected', () => assert.equal(Hub.discover(device({})).state, 'absent'));
test('absent result clears battery', () => assert.equal(Hub.discover(device({})).level, -1));
test('rejects malformed discovery JSON', () => assert.equal(Hub.discover('{broken').state, 'error'));
test('rejects unsuccessful discovery response', () => assert.equal(Hub.discover('{"code":500,"device":{}}').state, 'error'));
test('does not guess between multiple headsets', () => assert.equal(Hub.discover(device({a:{Product:'VIRTUOSO XT'},b:{Product:'VIRTUOSO XT'}})).state, 'error'));
test('excludes hidden headsets', () => assert.equal(Hub.discover(device({a:{Product:'VIRTUOSO XT',Hidden:true}})).state, 'absent'));
test('supports case-insensitive Corsair name prefix', () => assert.equal(Hub.discover(device({a:{Product:' Corsair Virtuoso XT '}})).serial,'a'));
test('rejects overly long serial', () => assert.equal(Hub.discover(device({a:{Product:'VIRTUOSO XT',Serial:'a'.repeat(129)}})).state,'absent'));
test('unmuted is 0', () => assert.equal(Hub.parseDevice(live(74)).mute,0));
test('muted is 1', () => assert.equal(Hub.parseDevice(live(74,1)).mute,1));
test('reads detailed API BatteryLevel 74', () => assert.equal(Hub.parseDevice(live(74)).level,74));
test('subsequent detailed API BatteryLevel can decrease to 71', () => assert.equal(Hub.parseDevice(live(71)).level,71));
test('ignores unrelated summary and CLI values', () => {
    const x=Hub.parseDevice(JSON.stringify({code:200,data:{Level:100},battery:{level:59},device:{Connected:true,MuteStatus:0,BatteryLevel:71}}));
    assert.equal(x.level,71);
});
test('off discards retained battery and mute', () => {
    const x=Hub.parseDevice(device({Connected:false,MuteStatus:1,BatteryLevel:74}));
    assert.equal(x.state,'disconnected'); assert.equal(x.mute,-1); assert.equal(x.level,-1);
});
test('missing battery produces unknown, not zero', () => assert.equal(Hub.parseDevice(device({Connected:true,MuteStatus:0})).level,-1));
for (const value of [null,'71',true,-1,101,{},[]]) {
    test('rejects invalid BatteryLevel '+JSON.stringify(value), () => assert.equal(Hub.parseDevice(live(value)).level,-1));
}
test('rejects non-finite internal levels', () => {assert.equal(Hub.validLevel(NaN),-1);assert.equal(Hub.validLevel(Infinity),-1);});
test('zero percent is valid data', () => assert.equal(Hub.parseDevice(live(0)).level,0));
test('100 percent is valid data, never a fallback', () => assert.equal(Hub.parseDevice(live(100)).level,100));
test('rounds an in-range decimal for display', () => assert.equal(Hub.parseDevice(live(70.6)).level,71));
test('missing mute stays unknown while valid battery remains visible', () => {
    const x=Hub.parseDevice(device({Connected:true,BatteryLevel:71}));assert.equal(x.mute,-1);assert.equal(x.level,71);
});
test('unexpected mute enum is not unmuted', () => assert.equal(Hub.parseDevice(live(71,2)).mute,-1));
test('string connection is not accepted as boolean', () => assert.equal(Hub.parseDevice(device({Connected:'false',BatteryLevel:71})).state,'error'));
test('missing connection is unknown', () => assert.equal(Hub.parseDevice(device({MuteStatus:0,BatteryLevel:71})).state,'error'));
test('invalid status JSON is rejected', () => assert.equal(Hub.parseDevice('<html>error</html>').state,'error'));
test('null device triggers rediscovery', () => assert.equal(Hub.parseDevice(device(null)).rediscover,true));
test('API 404 triggers rediscovery', () => assert.equal(Hub.parseDevice('{"code":404}').rediscover,true));
test('USB mode is not interpreted as charging', () => {
    const x=Hub.parseDevice(device({Connected:true,MuteStatus:0,BatteryLevel:71,Usb:true}));assert.equal(Object.hasOwn(x,'charging'),false);
});
const present = (level, state='connected', at=100000, now=100010) =>
    Hub.batteryPresentation(level, at, now, state);
for (const [level, band, label, bars] of [
    [0,'low','Low',1], [20,'low','Low',1], [21,'medium','Medium',2],
    [48,'medium','Medium',2], [49,'medium','Medium',2], [60,'medium','Medium',2],
    [61,'high','High',3], [70,'high','High',3], [100,'high','High',3]
]) {
    test('level '+level+' maps to '+band+' with '+bars+' filled bars', () => {
        const x=present(level);assert.equal(x.band,band);assert.equal(x.label,label);assert.equal(x.bars,bars);
    });
}
test('all integer values use the documented thresholds without overlap', () => {
    for(let value=0;value<=100;value++) {
        assert.equal(present(value).band,value<=20?'low':value<=60?'medium':'high');
    }
});
for(const state of ['disconnected','absent']) {
    test(state+' discards retained high/low display', () => {
        for(const level of [0,48,100]) {const x=present(level,state);assert.equal(x.band,'disconnected');assert.equal(x.bars,0);}
    });
}
for(const state of ['error','checking']) {
    test(state+' shows unknown rather than a reassuring battery', () => {
        const x=present(100,state);assert.equal(x.band,'unknown');assert.equal(x.bars,0);
    });
}
test('API response expires after 10 seconds', () => assert.equal(present(71,'connected',100000,110001).band,'unknown'));
test('clock rollback invalidates response timestamp', () => assert.equal(present(71,'connected',100000,99000).band,'unknown'));
test('no successful API response shows unknown', () => assert.equal(present(71,'connected',0,100000).band,'unknown'));
test('unknown battery shows unavailable rather than low', () => {assert.equal(present(-1).band,'unknown');assert.equal(present(-1).label,'Unavailable');});
for(const value of [null,undefined,'48',true,{},[],NaN,Infinity,-1,101]) {
    test('invalid display value '+String(value)+' has no filled bars', () => {assert.equal(present(value).band,'unknown');assert.equal(present(value).bars,0);});
}
test('49 -> 48 deliberately remains the same medium icon', () => {
    assert.equal(present(49).band,present(48).band);assert.equal(present(49).bars,present(48).bars);
});
test('reconnect jump is not smoothed or hidden across bands', () => {
    assert.equal(present(70).band,'high');assert.equal(present(70,'disconnected').band,'disconnected');assert.equal(present(49).band,'medium');
});
test('an increasing estimate can change band without implying charging', () => {
    const x=present(61);assert.equal(present(60).band,'medium');assert.equal(x.band,'high');assert.equal(Object.hasOwn(x,'charging'),false);
});
test('presentation labels do not expose numeric percentages', () => {
    for(const level of [-1,0,20,21,48,60,61,100]) assert.doesNotMatch(present(level).label,/[0-9%]/);
});

// Run the real methods from HubStatus.qml with a mock QML scope and async XHR.
// This checks JS lifecycle logic, not Qt property binding or the visual UI.
const qml = fs.readFileSync(path.join(base,'contents/ui/HubStatus.qml'),'utf8');
const functions = [...qml.matchAll(/^    function (\w+)\(([^)]*)\) \{([\s\S]*?)^    \}/gm)]
    .map(m=>`function ${m[1]}(${m[2]}) {${m[3]}\n}`).join('\n');
let clock=200000;
const requests=[];
class MockXHR {
    static DONE=4;
    constructor(){this.readyState=0;this.status=0;this.responseText='';this.headers={};requests.push(this);}
    open(method,url,async){assert.equal(method,'GET');assert.equal(async,true);this.url=url;}
    setRequestHeader(key,value){this.headers[key]=value;}
    send(){this.sent=true;}
    abort(){this.aborted=true;this.readyState=0;if(this.onreadystatechange)this.onreadystatechange();}
    reply(status,body){this.status=status;this.responseText=body;this.readyState=4;this.onreadystatechange();}
}
let timerRunning=false;
const c=vm.createContext({Hub,Date:{now:()=>clock},XMLHttpRequest:MockXHR,
    hubUrl:'http://127.0.0.1:27003/',deviceSerial:'',connectionState:'checking',muteStatus:-1,batteryLevel:-1,
    detail:'Checking',nowMs:clock,lastStatusAt:0,pendingRequest:null,
    requestTimeout:{stop(){timerRunning=false;},restart(){timerRunning=true;}}
});
c.client=c;
vm.runInContext(functions,c);
test('asynchronous read-only discovery starts',()=>{c.poll();assert.match(requests.at(-1).url,/^http:\/\/127\.0\.0\.1:27003\/api\/\?vxtPoll=/);assert.equal(timerRunning,true);});
test('requests do not overlap',()=>{const n=requests.length;c.poll();assert.equal(requests.length,n);});
test('discovery queries headset serial immediately',()=>{requests.at(-1).reply(200,list);assert.match(requests.at(-1).url,new RegExp('/api/devices/'+serial+'\\?'));assert.equal(c.deviceSerial,serial);});
test('first response provides battery/mute/connection together',()=>{
    requests.at(-1).reply(200,live(74));assert.equal(c.batteryLevel,74);assert.equal(c.connectionState,'connected');assert.equal(c.muteStatus,0);assert.equal(c.lastStatusAt,clock);assert.equal(timerRunning,false);
});
test('successive poll accepts 74 -> 71, keeping the high band',()=>{
    clock+=2000;c.poll();requests.at(-1).reply(200,live(71));assert.equal(c.batteryLevel,71);assert.equal(Hub.batteryPresentation(c.batteryLevel,c.lastStatusAt,c.nowMs,c.connectionState).band,'high');
});
test('same battery still updates API response time',()=>{
    const before=c.lastStatusAt;clock+=2000;c.poll();requests.at(-1).reply(200,live(71));assert.equal(c.batteryLevel,71);assert.ok(c.lastStatusAt>before);
});
test('next API poll follows mute change',()=>{clock+=2000;c.poll();requests.at(-1).reply(200,live(71,1));assert.equal(c.muteStatus,1);});
test('power off clears battery and mute',()=>{
    clock+=2000;c.poll();requests.at(-1).reply(200,device({Connected:false,MuteStatus:1,BatteryLevel:71}));assert.equal(c.connectionState,'disconnected');assert.equal(c.muteStatus,-1);assert.equal(c.batteryLevel,-1);
});
test('reconnection gets new battery without minute delay',()=>{clock+=2000;c.poll();requests.at(-1).reply(200,live(70));assert.equal(c.connectionState,'connected');assert.equal(c.batteryLevel,70);});
test('invalid battery clears level without losing mute',()=>{clock+=2000;c.poll();requests.at(-1).reply(200,live(null,1));assert.equal(c.batteryLevel,-1);assert.equal(c.muteStatus,1);});
test('network failure clears battery and mute',()=>{clock+=2000;c.poll();requests.at(-1).reply(0,'');assert.equal(c.connectionState,'error');assert.equal(c.batteryLevel,-1);assert.equal(c.muteStatus,-1);});
test('service recovery restores reading',()=>{clock+=5000;c.poll();requests.at(-1).reply(200,live(70,1));assert.equal(c.batteryLevel,70);assert.equal(c.muteStatus,1);});
test('HTTP 404 schedules rediscovery',()=>{clock+=2000;c.poll();requests.at(-1).reply(404,'');assert.equal(c.deviceSerial,'');assert.equal(c.batteryLevel,-1);});
test('rediscovery recovers actual device',()=>{clock+=5000;c.poll();requests.at(-1).reply(200,list);requests.at(-1).reply(200,live(70));assert.equal(c.batteryLevel,70);});
test('suspend gap clears old indication before reply',()=>{clock+=30000;c.poll();assert.equal(c.connectionState,'error');assert.equal(c.batteryLevel,-1);assert.equal(c.muteStatus,-1);});
test('cancellation aborts and ignores late reply',()=>{
    const old=requests.at(-1);c.cancelRequest();c.fail('Timeout');assert.equal(old.aborted,true);assert.equal(c.pendingRequest,null);assert.equal(timerRunning,false);
    old.reply(200,live(99));assert.equal(c.connectionState,'error');assert.equal(c.batteryLevel,-1);
});
test('polling resumes after cancelled request',()=>{clock+=5000;c.poll();requests.at(-1).reply(200,live(69,1));assert.equal(c.batteryLevel,69);});
test('request uses no-cache header',()=>assert.equal(requests.at(-1).headers['Cache-Control'],'no-cache'));
const main=fs.readFileSync(path.join(base,'contents/ui/main.qml'),'utf8');
test('battery display binds to detailed API client through band mapping',()=>{assert.match(main,/Hub.batteryPresentation\(hub.batteryLevel, hub.lastStatusAt/);assert.match(main,/band: root.batteryDisplay.band/);});
test('no HeadsetControl executable engine or battery process remains',()=>{assert.doesNotMatch(main,/HeadsetControl|headsetcontrol|Plasma5Support|plasma5support|batteryCommand|DataSource/);assert.equal(fs.existsSync(path.join(base,'contents/code/Battery.js')),false);});
test('two-second status timer and bounded request remain',()=>{assert.match(qml,/\? 5000 : 2000/);assert.match(qml,/interval: 3000/);});
test('tooltip shows last API response, not claimed sensor sample time',()=>{assert.match(main,/Last successful API response:/);assert.match(main,/device reports may update less often/);});
test('click and keyboard access retained',()=>{assert.match(main,/onClicked: Qt.openUrlExternally\(root.hubUrl\)/);assert.match(main,/Keys.onReturnPressed/);});
test('red physical mute icon retained',()=>{assert.match(main,/source: "microphone-sensitivity-muted"/);assert.match(main,/color: Kirigami.Theme.negativeTextColor/);});
test('same public package ID with version 1.4.0',()=>{
    const m=JSON.parse(fs.readFileSync(path.join(base,'metadata.json'),'utf8'));
    assert.equal(m.KPlugin.Id,'io.github.n3vrs0ft.virtuosoxt');assert.equal(m.KPlugin.Version,'1.4.0');assert.equal(m['X-Plasma-API-Minimum-Version'],'6.0');
});
const icon=fs.readFileSync(path.join(base,'contents/ui/BatteryIndicator.qml'),'utf8');
test('battery icon has explicit red/yellow/green colors independent of theme',()=>{
    for(const color of ['#ef5350','#f6c343','#63d699','#9aa0a6']) assert.ok(icon.includes(color));
});
test('one/two/three fills supplement color',()=>{assert.match(icon,/band === "low" \? 1 : band === "medium" \? 2 : band === "high" \? 3 : 0/);assert.match(icon,/model: 3/);assert.match(icon,/index < battery.activeBars/);});
test('unknown battery uses grey and a question mark without normal fill',()=>{assert.match(icon,/text: "\?"/);assert.match(icon,/visible: !battery.hasReading/);assert.match(icon,/visible: battery.hasReading/);});
test('off state uses dimmed dash label while battery icon is hidden',()=>{assert.match(main,/text: "--"/);assert.match(main,/visible: root.showDisconnected/);assert.match(main,/visible: !root.showDisconnected/);assert.match(main,/opacity: hub.connected \? 1 : 0.4/);});
test('numeric percentage is offered only in hover, with the existing band panel',()=>{assert.match(main,/hoverBattery: batteryDisplay.bars > 0/);assert.match(main,/String\(hub\.batteryLevel\)\s*\+\s*"%/);assert.match(main,/id: virtuosoHoverTooltip/);assert.match(main,/band: root.batteryDisplay.band/);});
test('tooltip makes approximation and reconnect caveat explicit',()=>{assert.match(main,/approximate OpenLinkHub reading/);assert.match(main,/estimate may jump after reconnecting/);});
test('accessible name includes text state, not color alone',()=>{assert.match(main,/Accessible.name:/);assert.match(main,/approximate estimate/);});
test('new battery component has no external assets or network access',()=>{assert.doesNotMatch(icon,/XMLHttpRequest|Image\s*\{|https?:|Qt.openUrl/);});
console.log(`\n${count} tests passed. Plasma rendering, Qt bindings, real hardware and battery accuracy are NOT tested here.`);

test('service controls use only fixed URLs and do not shell out from QML',()=>{
  for(const op of ['start','restart','enable']) assert.ok(main.includes('virtuosoxt-service://'+op));
  assert.doesNotMatch(main,/sudo|pkexec|systemctl/);
});
