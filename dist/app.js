import {naturals,makePool,drawRound,staffSvg} from './music.js?v=20260927-1';
import {keyEvent,midiName} from './midi.js';
import {summarizeAnswers} from './round-stats.js';
import {SONGS,noteForMidi,songScoreSvg} from './songs.js';
import {MIDI_SERVICE,MIDI_CHARACTERISTIC,decodeBleMidi,withTimeout} from './bluetooth-midi.js';
const $=id=>document.getElementById(id);
let round=[],index=0,revealed=false,active=false,timer=null;
let practiceMode='count',practicePool=[],practiceDurationMs=0,practiceEndsAt=0,practiceClock=null;
let practiceClef='treble';
const clefRanges={treble:{min:48,max:96,low:60,high:84},bass:{min:36,max:72,low:36,high:60}};
let sessionMode=null,currentScreen='welcome';
let answers=[],noteShownAt=0;
let currentSong=null,songIndex=0,songWrongMidi=null,songErrors=0,songStartedAt=0,songLocked=false,songTimer=null;
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
  for(const chip of document.querySelectorAll('.connected-chip'))chip.textContent=ready?'✓ '+(bluetoothDevice.name||'adsilent'):'Nicht verbunden';
  valid();
  return ready;
}
function clearSteps(){step('browser','waiting','Noch nicht freigegeben');step('device','waiting','Noch kein Gerät ausgewählt');step('stream','waiting','Warte auf Verbindung');}

const held=new Set();
const midiMode=()=>sessionMode==='midi';
const songMode=()=>sessionMode==='song';
const pianoMode=()=>sessionMode==='piano'||midiMode()||songMode();
const connected=()=>!!(notificationsReady&&bluetoothCharacteristic&&bluetoothDevice?.gatt.connected);
const timedPractice=()=>practiceMode==='time';
function populateNoteRange(){
  const range=clefRanges[practiceClef];
  for(const id of ['low','high']){
    $(id).replaceChildren();
    for(const note of naturals.filter(note=>note.midi>=range.min&&note.midi<=range.max)){
      const option=document.createElement('option');option.value=note.midi;option.textContent=`${note.letter}${note.octave}`;$(id).append(option);
    }
    $(id).value=String(range[id]);
  }
}
populateNoteRange();
function valid(){
  const rangeOk=Number($('low').value)<=Number($('high').value);
  const count=Number($('count').value);
  const countOk=$('count').validity.valid&&Number.isSafeInteger(count)&&count>=1;
  const minutes=Number($('minutes').value);
  const minutesOk=$('minutes').validity.valid&&Number.isSafeInteger(minutes)&&minutes>=1;
  $('range-error').hidden=rangeOk;
  $('count-error').hidden=practiceMode!=='count'||countOk;
  $('minutes-error').hidden=practiceMode!=='time'||minutesOk;
  $('count').setAttribute('aria-invalid',String(!countOk));
  $('minutes').setAttribute('aria-invalid',String(!minutesOk));
  $('count-badge').textContent=practiceMode==='time'
    ?(minutesOk?`${minutes} ${minutes===1?'Minute':'Minuten'}`:'–')
    :(countOk?`${count} ${count===1?'Note':'Noten'}`:'–');
  const lengthOk=practiceMode==='time'?minutesOk:countOk;
  const ready=!!sessionMode&&rangeOk&&lengthOk&&(!pianoMode()||connected());
  $('start').disabled=!ready;
  $('again').disabled=!ready;
  return ready;
}
for(const id of ['low','high'])$(id).addEventListener('change',()=>{clefRanges[practiceClef][id]=Number($(id).value);valid();});
for(const input of document.querySelectorAll('[name="clef"]'))input.addEventListener('change',()=>{
  practiceClef=input.value;populateNoteRange();valid();
});
$('count').addEventListener('input',valid);
$('minutes').addEventListener('input',valid);
for(const input of document.querySelectorAll('[name="practice-mode"]'))input.addEventListener('change',()=>{
  practiceMode=input.value;
  $('count-setting').hidden=timedPractice();$('minutes-setting').hidden=!timedPractice();
  $('count').required=!timedPractice();$('minutes').required=timedPractice();valid();
});
function clearPracticeClock(){clearInterval(practiceClock);practiceClock=null;}
function show(id){
  if(['piano-mode-select','setup','exercise','complete','song-select','song-play','song-complete'].includes(id)){
    if(!sessionMode)id='welcome';
    else if(pianoMode()&&!connected())id='connection';
  }
  currentScreen=id;
  for(const section of ['welcome','connection','piano-mode-select','setup','exercise','complete','song-select','song-play','song-complete'])$(section).hidden=section!==id;
}
function chooseSession(mode){
  clearTimeout(timer);clearTimeout(songTimer);clearPracticeClock();active=false;sessionMode=mode;
  if(pianoMode()){
    show('connection');
    if(!checkConnection()&&!connecting&&!checkingKnown)restoreKnownDevice();
  }else{show('setup');checkConnection();$('low').focus();}
}
function returnToWelcome(){clearTimeout(timer);clearTimeout(songTimer);clearPracticeClock();active=false;show('welcome');$('choose-midi').focus();}
$('choose-midi').addEventListener('click',()=>chooseSession('piano'));
$('choose-manual').addEventListener('click',()=>chooseSession('manual'));
for(const id of ['connection-back','piano-mode-back'])$(id).addEventListener('click',returnToWelcome);
$('connection-next').addEventListener('click',()=>{
  if(!pianoMode()||!checkConnection())return;
  sessionMode='piano';show('piano-mode-select');$('choose-note-mode').focus();
});
$('choose-note-mode').addEventListener('click',()=>{sessionMode='midi';show('setup');$('low').focus();});
$('choose-song-mode').addEventListener('click',()=>{sessionMode='song';show('song-select');$('song-list').querySelector('button')?.focus();});
$('setup-back').addEventListener('click',()=>{
  if(midiMode()){sessionMode='piano';show('piano-mode-select');}
  else returnToWelcome();
});
$('song-select-back').addEventListener('click',()=>{sessionMode='piano';show('piano-mode-select');});

for(const song of SONGS){
  const card=document.createElement('article');card.className='song-card';
  const copy=document.createElement('div');
  const title=document.createElement('h2');title.textContent=song.title;
  const detail=document.createElement('p');detail.textContent=song.detail;
  copy.append(title,detail);
  const button=document.createElement('button');button.className='primary';button.textContent='Lied starten →';button.addEventListener('click',()=>startSong(song));
  card.append(copy,button);$('song-list').append(card);
}

function renderSong(){
  $('song-title').textContent=currentSong.title;
  const event=currentSong.events[songIndex];
  const totalNotes=currentSong.events.filter(item=>item.type==='note').length;
  const noteNumber=currentSong.events.slice(0,songIndex+1).filter(item=>item.type==='note').length;
  $('song-counter').textContent=event?.type==='rest'?'Pause':`Note ${Math.min(noteNumber,totalNotes)} von ${totalNotes}`;
  $('song-progress').innerHTML=`<span class="progress-fill" style="width:${100*songIndex/currentSong.events.length}%"></span>`;
  $('song-score').innerHTML=songScoreSvg(currentSong,songIndex,songWrongMidi);
}
function songMidiName(midi){
  const pitch=noteForMidi(midi,currentSong.preferFlats);
  return pitch?`${pitch.name}${pitch.octave}`:midiName(midi);
}
function continueSong(){
  if(songIndex>=currentSong.events.length){finishSong();return;}
  renderSong();
  const event=currentSong.events[songIndex];
  if(event.type!=='rest'){
    songLocked=false;
    $('song-feedback').className='song-feedback';$('song-feedback').textContent='Spiele die markierte Note.';
    return;
  }
  songLocked=true;
  $('song-feedback').className='song-feedback rest';$('song-feedback').textContent='Pause';
  songTimer=setTimeout(()=>{songIndex++;continueSong();},event.duration*60000/currentSong.tempo);
}
function startSong(song=currentSong){
  if(!checkConnection()){show('connection');return;}
  currentSong=song;songIndex=0;songWrongMidi=null;songErrors=0;songLocked=false;songStartedAt=performance.now();
  clearTimeout(songTimer);active=true;show('song-play');continueSong();
}
function finishSong(){
  active=false;songLocked=false;
  $('song-complete-name').textContent=currentSong.title;
  $('song-errors').textContent=String(songErrors);
  $('song-time').textContent=new Intl.NumberFormat('de-AT',{maximumFractionDigits:1}).format((performance.now()-songStartedAt)/1000)+' s';
  show('song-complete');$('song-again').focus();
}
function playSongKey(key){
  if(!active||!songMode()||songLocked)return;
  const target=currentSong.events[songIndex];
  if(target.type!=='note')return;
  clearTimeout(songTimer);
  if(key.note!==target.midi){
    songErrors++;songWrongMidi=key.note;renderSong();
    $('song-feedback').className='song-feedback wrong';
    $('song-feedback').textContent=`Gesucht: ${songMidiName(target.midi)} · Gespielt: ${songMidiName(key.note)} — noch einmal`;
    songTimer=setTimeout(()=>{
      if(!active||!songMode())return;
      songWrongMidi=null;renderSong();$('song-feedback').className='song-feedback';$('song-feedback').textContent='Versuche dieselbe Note noch einmal.';
    },1200);
    return;
  }
  songWrongMidi=null;songIndex++;
  continueSong();
}
$('song-back').addEventListener('click',()=>{clearTimeout(songTimer);active=false;show('song-select');});
$('song-again').addEventListener('click',()=>startSong());
$('song-choose').addEventListener('click',()=>show('song-select'));

function render(){
  const note=round[index];
  $('counter').textContent=timedPractice()?`Note ${index+1}`:`Note ${index+1} von ${round.length}`;
  $('practice-timer').hidden=!timedPractice();
  if(!timedPractice())$('progress').innerHTML=`<span class="progress-fill" style="width:${100*(index+(revealed?1:0))/round.length}%"></span>`;
  $('staff').innerHTML=staffSvg(note,null,practiceClef);
  document.querySelector('.note-panel').classList.remove('correct','incorrect');
  $('next').hidden=midiMode();
  $('exercise-hint').textContent=midiMode()?'Spiele die passende Taste – auch die Oktave zählt.':'Sag den Namen laut oder einfach im Kopf.';
  $('answer').replaceChildren();
  if(revealed){const name=document.createElement('strong');name.textContent=note.name;const octave=document.createElement('small');octave.textContent=`${note.name}${note.octave}`;$('answer').append(name,octave);}else $('answer').textContent=midiMode()?'Warte auf deinen Tastendruck …':'Erst überlegen, dann aufdecken.';
  $('next').textContent=revealed?(!timedPractice()&&index===round.length-1?'Runde abschließen':'Nächste Note →'):'Lösung anzeigen';
  if(midiMode()&&!revealed)noteShownAt=performance.now();
}
function updatePracticeClock(){
  if(!active||!timedPractice())return;
  const remaining=Math.max(0,practiceEndsAt-Date.now());
  const seconds=Math.ceil(remaining/1000),minutes=Math.floor(seconds/60);
  $('practice-timer').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  $('progress').innerHTML=`<span class="progress-fill" style="width:${Math.min(100,100*(practiceDurationMs-remaining)/practiceDurationMs)}%"></span>`;
  if(remaining===0)finishPractice();
}
function finishPractice(){
  if(!active)return;
  clearTimeout(timer);clearPracticeClock();active=false;
  $('practice-timer').textContent='00:00';
  $('complete-title').textContent=timedPractice()?'Zeit ist um':'Runde beendet';
  $('again').firstChild.textContent=timedPractice()?'Noch einmal ':'Noch eine Runde ';
  showRoundStats();show('complete');$('again').focus();
}
function start(){
  if(midiMode()&&!checkConnection()){show('setup');return;}if(!valid())return;
  practicePool=makePool(Number($('low').value),Number($('high').value),$('black').checked);
  round=drawRound(practicePool,timedPractice()?1:Number($('count').value));index=0;revealed=false;active=true;answers=[];
  $('round-stats').hidden=true;clearTimeout(timer);clearPracticeClock();show('exercise');
  if(timedPractice()){
    practiceDurationMs=Number($('minutes').value)*60000;practiceEndsAt=Date.now()+practiceDurationMs;
    practiceClock=setInterval(updatePracticeClock,250);updatePracticeClock();
  }
  render();(midiMode()?$('back'):$('next')).focus();
}
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
  if(timedPractice()){
    if(Date.now()>=practiceEndsAt){finishPractice();return;}
    const previous=round[index],choices=practicePool.length>1?practicePool.filter(notes=>notes[0].midi!==previous.midi):practicePool;
    round.push(drawRound(choices,1)[0]);index++;revealed=false;render();
  }else if(index<round.length-1){index++;revealed=false;render();}
  else finishPractice();
}
$('next').addEventListener('click',()=>{if(timedPractice()&&Date.now()>=practiceEndsAt){finishPractice();return;}if(!revealed){revealed=true;render();}else advance();});
function stop(){clearTimeout(timer);clearPracticeClock();active=false;show('setup');checkConnection();}
for(const id of ['back','settings'])$(id).addEventListener('click',()=>{stop();$('start').focus();});
function receive(event){
  const receivedAt=performance.now();
  const key=keyEvent(event.data);if(!key)return;
  const id=`${key.channel}:${key.note}`;
  if(!key.down){held.delete(id);return;}
  if(held.has(id))return;held.add(id);
  step('stream','done','Tastendruck erkannt: '+midiName(key.note));
  $('midi-test').textContent=`Empfangen: ${midiName(key.note)} · Verbindung funktioniert.`;
  if(active&&songMode()){playSongKey(key);return;}
  if(!active||!midiMode()||revealed)return;
  if(timedPractice()&&Date.now()>=practiceEndsAt){finishPractice();return;}
  revealed=true;render();
  const target=round[index],correct=key.note===target.midi;
  answers.push({targetMidi:target.midi,playedMidi:key.note,correct,durationMs:Math.max(0,receivedAt-noteShownAt)});
  document.querySelector('.note-panel').classList.add(correct?'correct':'incorrect');
  if(!correct){
    const spellings=makePool(key.note,key.note,true)[0];
    const played=spellings.find(n=>n.accidental===target.accidental)||spellings[0];
    $('staff').innerHTML=staffSvg(target,played,practiceClef);
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
  if(pianoMode()&&currentScreen!=='welcome'){clearTimeout(timer);clearTimeout(songTimer);clearPracticeClock();active=false;show('connection');}
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
