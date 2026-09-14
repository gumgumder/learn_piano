import {naturals,makePool,drawRound,staffSvg} from './music.js';
import {keyEvent,midiName} from './midi.js';
import {summarizeAnswers} from './round-stats.js';
import {MIDI_SERVICE,MIDI_CHARACTERISTIC,decodeBleMidi,withTimeout} from './bluetooth-midi.js';
const $=id=>document.getElementById(id);
let round=[],index=0,revealed=false,active=false,timer=null;
let sessionMode=null,currentScreen='welcome';
let answers=[],noteShownAt=0;
let bluetoothDevice=null,bluetoothCharacteristic=null,rememberedDevice=null,notificationsReady=false;
let connecting=false,packetCount=0,checkingKnown=false;
function step(id,state,detail){$('step-'+id).dataset.state=state;$('detail-'+id).textContent=detail;}
function log(message){const item=document.createElement('li');item.textContent=new Date().toLocaleTimeString('de-AT')+' · '+message;$('connection-log').prepend(item);while($('connection-log').children.length>8)$('connection-log').lastElementChild.remove();}
function busy(value){connecting=value;$('bluetooth-connect').disabled=value;checkConnection();}
function checkConnection(){
  const ready=connected();
  $('connection-summary').dataset.state=ready?'done':connecting||checkingKnown?'working':'waiting';
  $('connection-summary').textContent=ready?`✓ Bereits verbunden · ${bluetoothDevice.name||'adsilent'}`:connecting?'Verbindung wird hergestellt …':checkingKnown?'Bekanntes Klavier wird geprüft …':'Verbindung herstellen, um am Klavier zu üben.';
  $('bluetooth-connect').hidden=ready;
  $('bluetooth-connect').disabled=connecting||checkingKnown;
  $('bluetooth-connect').textContent=rememberedDevice?'Mit '+(rememberedDevice.name||'adsilent')+' verbinden':'Nach Bluetooth-MIDI-Geräten suchen';
  $('bluetooth-disconnect').hidden=!ready;
  $('connection-next').disabled=!ready;
  $('connection-next').hidden=!ready;
  $('setup-connection').hidden=!midiMode();
  $('setup-connection').dataset.state=ready?'done':'waiting';
  $('setup-connection').textContent=ready?'✓ '+(bluetoothDevice.name||'adsilent'):'Nicht verbunden';
  $('setup-connection').setAttribute('aria-label',ready?'Klavier verbunden: '+(bluetoothDevice.name||'adsilent'):'Klavier nicht verbunden');
  valid();
  return ready;
}
function clearSteps(){step('browser','waiting','Noch nicht freigegeben');step('device','waiting','Noch kein Gerät ausgewählt');step('stream','waiting','Warte auf Verbindung');}

const held=new Set();
const midiMode=()=>sessionMode==='midi';
const connected=()=>!!(notificationsReady&&bluetoothCharacteristic&&bluetoothDevice?.gatt.connected);
for(const note of naturals){for(const id of ['low','high']){const option=document.createElement('option');option.value=note.midi;option.textContent=`${note.letter}${note.octave}`;$(id).append(option);}}
$('low').value='60';$('high').value='84';
function valid(){
  const rangeOk=Number($('low').value)<=Number($('high').value);
  const count=Number($('count').value);
  const countOk=$('count').validity.valid&&Number.isSafeInteger(count)&&count>=1;
  $('range-error').hidden=rangeOk;
  $('count-error').hidden=countOk;
  $('count').setAttribute('aria-invalid',String(!countOk));
  $('count-badge').textContent=countOk?`${count} ${count===1?'Note':'Noten'}`:'–';
  const ready=!!sessionMode&&rangeOk&&countOk&&(!midiMode()||connected());
  $('start').disabled=!ready;
  $('again').disabled=!ready;
  return ready;
}
$('low').addEventListener('change',valid);$('high').addEventListener('change',valid);
$('count').addEventListener('input',valid);
function show(id){
  if(['setup','exercise','complete'].includes(id)){
    if(!sessionMode)id='welcome';
    else if(midiMode()&&!connected())id='connection';
  }
  currentScreen=id;
  for(const section of ['welcome','connection','setup','exercise','complete'])$(section).hidden=section!==id;
}
function chooseSession(mode){
  clearTimeout(timer);active=false;sessionMode=mode;
  if(mode==='midi'){
    show('connection');
    if(!checkConnection()&&!connecting&&!checkingKnown)restoreKnownDevice();
  }else{show('setup');checkConnection();$('low').focus();}
}
function returnToWelcome(){clearTimeout(timer);active=false;show('welcome');$('choose-midi').focus();}
$('choose-midi').addEventListener('click',()=>chooseSession('midi'));
$('choose-manual').addEventListener('click',()=>chooseSession('manual'));
for(const id of ['connection-back','setup-back'])$(id).addEventListener('click',returnToWelcome);
$('connection-next').addEventListener('click',()=>{if(midiMode()&&checkConnection()){show('setup');$('low').focus();}});

function render(){
  const note=round[index];$('counter').textContent=`Note ${index+1} von ${round.length}`;
  $('progress').innerHTML=`<span class="progress-fill" style="width:${100*(index+(revealed?1:0))/round.length}%"></span>`;
  $('staff').innerHTML=staffSvg(note);
  document.querySelector('.note-panel').classList.remove('correct','incorrect');
  $('next').hidden=midiMode();
  $('exercise-hint').textContent=midiMode()?'Spiele die passende Taste – auch die Oktave zählt.':'Sag den Namen laut oder einfach im Kopf.';
  $('answer').replaceChildren();
  if(revealed){const name=document.createElement('strong');name.textContent=note.name;const octave=document.createElement('small');octave.textContent=`${note.name}${note.octave}`;$('answer').append(name,octave);}else $('answer').textContent=midiMode()?'Warte auf deinen Tastendruck …':'Erst überlegen, dann aufdecken.';
  $('next').textContent=revealed?(index===round.length-1?'Runde abschließen':'Nächste Note →'):'Lösung anzeigen';
  if(midiMode()&&!revealed)noteShownAt=performance.now();
}
function start(){if(midiMode()&&!checkConnection()){show('setup');return;}if(!valid())return;round=drawRound(makePool(Number($('low').value),Number($('high').value),$('black').checked),Number($('count').value));index=0;revealed=false;active=true;answers=[];$('round-stats').hidden=true;clearTimeout(timer);show('exercise');render();(midiMode()?$('back'):$('next')).focus();}
$('start').addEventListener('click',start);$('again').addEventListener('click',start);
function showRoundStats(){
  $('round-stats').hidden=!midiMode();
  if(!midiMode())return;
  const stats=summarizeAnswers(answers);
  $('stat-correct').textContent=`${stats.correct} von ${stats.total}`;
  $('stat-time').textContent=new Intl.NumberFormat('de-AT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(stats.averageMs/1000)+' s';
}
function advance(){
  clearTimeout(timer);
  if(!active)return;
  if(index<round.length-1){index++;revealed=false;render();}
  else{active=false;showRoundStats();show('complete');$('again').focus();}
}
$('next').addEventListener('click',()=>{if(!revealed){revealed=true;render();}else advance();});
function stop(){clearTimeout(timer);active=false;show('setup');checkConnection();}
for(const id of ['back','settings'])$(id).addEventListener('click',()=>{stop();$('start').focus();});
function receive(event){
  const receivedAt=performance.now();
  const key=keyEvent(event.data);if(!key)return;
  const id=`${key.channel}:${key.note}`;
  if(!key.down){held.delete(id);return;}
  if(held.has(id))return;held.add(id);
  step('stream','done','Tastendruck erkannt: '+midiName(key.note));
  $('midi-test').textContent=`Empfangen: ${midiName(key.note)} · Verbindung funktioniert.`;
  if(!active||!midiMode()||revealed)return;
  revealed=true;render();
  const target=round[index],correct=key.note===target.midi;
  answers.push({targetMidi:target.midi,playedMidi:key.note,correct,durationMs:Math.max(0,receivedAt-noteShownAt)});
  document.querySelector('.note-panel').classList.add(correct?'correct':'incorrect');
  if(!correct){
    const spellings=makePool(key.note,key.note,true)[0];
    const played=spellings.find(n=>n.accidental===target.accidental)||spellings[0];
    $('staff').innerHTML=staffSvg(target,played);
  }
  $('answer').replaceChildren();
  const title=document.createElement('strong');title.textContent=correct?'Richtig!':'Nicht ganz';
  const detail=document.createElement('small');
  detail.textContent=correct
    ? `${target.name}${target.octave}`
    : `Gesucht: ${target.name}${target.octave} · Gespielt: ${midiName(key.note)}`;
  if(!correct)detail.className='answer-comparison';
  $('answer').append(title,detail);
  // Ignore further strikes during feedback; releasing a key never advances a round.
  timer=setTimeout(advance,correct?1000:1800);
}
// Returning to setup must not reload the page and discard the live Bluetooth session.
document.querySelector('header a').addEventListener('click',event=>{event.preventDefault();returnToWelcome();});
function disconnectBluetooth(){
  if(bluetoothCharacteristic)bluetoothCharacteristic.removeEventListener('characteristicvaluechanged',receiveBluetooth);
  bluetoothCharacteristic=null;notificationsReady=false;
  const device=bluetoothDevice;bluetoothDevice=null;
  if(device){device.removeEventListener('gattserverdisconnected',bluetoothLost);if(device.gatt.connected)device.gatt.disconnect();}
  $('bluetooth-disconnect').hidden=true;held.clear();
}
function bluetoothLost(){
  disconnectBluetooth();
  if(midiMode()&&currentScreen!=='welcome'){clearTimeout(timer);active=false;show('connection');}
  step('device','error','Bluetooth-Verbindung unterbrochen');step('stream','waiting','Keine Datenverbindung');
  $('midi-status').textContent='Verbindung verloren. Bitte erneut nach dem Klavier suchen.';
  log('Bluetooth-Verbindung unterbrochen.');checkConnection();
}
function receiveBluetooth(event){
  packetCount++;
  const messages=decodeBleMidi(event.target.value);
  $('midi-status').textContent=`Bluetooth verbunden: ${bluetoothDevice?.name||'Klavier'} · ${packetCount} Datenpakete empfangen`;
  for(const data of messages)receive({data});
}
$('bluetooth-disconnect').addEventListener('click',()=>{bluetoothLost();$('midi-status').textContent='Bluetooth-Verbindung getrennt.';});
async function connectBluetooth(knownDevice=null){
  if(connecting)return;
  if(checkConnection())return;
  if(!navigator.bluetooth){step('browser','error','Web Bluetooth nicht verfügbar');$('midi-status').textContent='Die direkte Bluetooth-Suche benötigt Google Chrome auf deinem Mac. Öffne diese App dort.';return;}
  disconnectBluetooth();held.clear();packetCount=0;
  $('device').replaceChildren(new Option('Warte auf Bluetooth-Auswahl',''));
  clearSteps();busy(true);valid();
  step('browser',knownDevice?'done':'working',knownDevice?'Klavier bereits freigegeben':'Wähle dein Klavier im Chrome-Suchfenster');step('device','working',knownDevice?'Prüfe Verbindung zum bekannten Klavier':'Chrome sucht Bluetooth-MIDI-Geräte in der Nähe');
  $('midi-status').textContent=knownDevice?'Verbinde mit dem bekannten Klavier …':'Bluetooth-Geräteauswahl geöffnet …';
  $('connection-help').textContent='Die Trefferliste ist im Chrome-Suchfenster. Die App kann vor deiner Auswahl weder Treffer noch die Signalstärke sehen. Falls nichts erscheint: Bluetooth am Mac prüfen, adsilent 2 in Reichweite bringen und bestehende Verbindungen zu anderen Apps oder Geräten trennen.';
  $('connection-help').hidden=!!knownDevice;
  log(knownDevice?'Bekanntes Klavier wird verbunden.':'Bluetooth-Geräteauswahl angefordert.');
  let chosen=null,stage=knownDevice?'connection':'selection';
  try{
    // Must be called from the click handler to preserve browser user activation.
    chosen=knownDevice||await navigator.bluetooth.requestDevice({filters:[{services:[MIDI_SERVICE]},{namePrefix:'adsilent'},{namePrefix:'ADsilent'}],optionalServices:[MIDI_SERVICE]});
    rememberedDevice=chosen;
    try{sessionStorage.setItem('piano-device-id',chosen.id);}catch{}
    $('device').replaceChildren(new Option(chosen.name||'Bluetooth-Klavier','bluetooth'));
    bluetoothDevice=chosen;chosen.addEventListener('gattserverdisconnected',bluetoothLost);
    step('browser','done','Bluetooth-Zugriff auf das gewählte Gerät erlaubt');stage='connection';
    step('device','working','Verbinde mit '+(chosen.name||'Klavier')+' …');log('Ausgewählt: '+(chosen.name||'Bluetooth-Gerät'));
    const connectPromise=chosen.gatt.connect();
    connectPromise.then(server=>{if(bluetoothDevice!==chosen)server.disconnect();},()=>{});
    const server=await withTimeout(connectPromise);
    step('device','done','Verbunden: '+(chosen.name||'Klavier'));stage='service';
    step('stream','working','Prüfe MIDI-Dienst …');log('Bluetooth-Verbindung hergestellt.');
    const service=await withTimeout(server.getPrimaryService(MIDI_SERVICE));
    const characteristic=await withTimeout(service.getCharacteristic(MIDI_CHARACTERISTIC));
    characteristic.addEventListener('characteristicvaluechanged',receiveBluetooth);
    bluetoothCharacteristic=characteristic;
    stage='notifications';step('stream','working','Aktiviere Empfang von Tastendrücken …');
    await withTimeout(characteristic.startNotifications());
    if(!chosen.gatt.connected)throw new Error('Verbindung unterbrochen');
    notificationsReady=true;
    step('stream','working','Empfang bereit. Drücke eine Taste am Klavier.');
    $('midi-status').textContent='Bluetooth-MIDI bereit: '+(chosen.name||'Klavier');
    $('midi-test').textContent='Noch kein Tastendruck empfangen. Spiele das mittlere C – erwartet wird C4.';
    $('connection-help').hidden=true;
    $('bluetooth-disconnect').hidden=false;log('MIDI-Empfang aktiviert. Warte auf Tastendruck.');
  }catch(error){
    disconnectBluetooth();
    const cancelled=stage==='selection'&&error.name==='NotFoundError';
    step(stage==='selection'?'browser':stage==='connection'?'device':'stream','error',cancelled?'Keine Geräteauswahl abgeschlossen':'Verbindung fehlgeschlagen');
    if(stage==='selection')step('device','waiting','Kein Gerät ausgewählt');
    else if(stage==='connection')step('stream','waiting','Warte auf Verbindung');
    else step('device','error','Verbindung nach Fehler getrennt');
    const reason=cancelled?'Kein Gerät ausgewählt. Das Suchfenster wurde geschlossen oder die Suche blieb ohne Auswahl.':error.name==='NotAllowedError'||error.name==='SecurityError'?'Bluetooth-Zugriff nicht erlaubt. Prüfe die Chrome-Website-Berechtigungen und macOS → Systemeinstellungen → Datenschutz & Sicherheit → Bluetooth.':stage==='service'?'Bluetooth verbunden, aber der MIDI-Dienst konnte nicht geöffnet werden. Prüfe, ob du das adsilent-MIDI-Gerät ausgewählt hast.':'Die Bluetooth-Verbindung konnte nicht vollständig aufgebaut werden. Trenne bestehende Verbindungen zu adsilent 2 in anderen Apps und versuche es erneut.';
    $('midi-status').textContent=reason;log('Abbruch bei '+stage+': '+error.name+' · '+error.message);
  }finally{busy(false);}
}
$('bluetooth-connect').addEventListener('click',()=>connectBluetooth(rememberedDevice));

async function restoreKnownDevice(){
  checkingKnown=true;checkConnection();
  try{
    if(!navigator.bluetooth?.getDevices)return;
    const devices=await navigator.bluetooth.getDevices();
    let savedId;try{savedId=sessionStorage.getItem('piano-device-id');}catch{}
    const saved=devices.find(d=>d.id===savedId);
    const adsilent=devices.filter(d=>/adsilent/i.test(d.name||''));
    rememberedDevice=saved||(adsilent.length===1?adsilent[0]:null);
    if(rememberedDevice){log('Bereits freigegebenes Klavier erkannt.');checkingKnown=false;await connectBluetooth(rememberedDevice);}
    else log('Kein eindeutig zugeordnetes, freigegebenes Klavier gefunden. Bitte einmal auswählen.');
  }catch(error){log('Bekannte Geräte konnten nicht geprüft werden: '+error.name);}
  finally{checkingKnown=false;checkConnection();}
}
function verifySession(){
  if(bluetoothDevice&&!bluetoothDevice.gatt.connected&&!connecting)bluetoothLost();
  else checkConnection();
}
window.addEventListener('focus',verifySession);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)verifySession();});
checkConnection();
