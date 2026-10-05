import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SONGS,eventMidis,practiceMidis,noteForMidi,rhythmExample,songScoreSvg} from '../dist/songs.js';
import {piratePage1Measures} from '../dist/pirate-page1.js';

test('Alle meine Entchen has the expected pitch sequence',()=>{
  const song=SONGS.find(song=>song.id==='alle-meine-entchen');
  assert.ok(song);
  const pitches=song.events.filter(event=>event.type==='note').map(event=>event.midi);
  assert.equal(pitches.length,27);
  assert.deepEqual(pitches.slice(0,6),[60,62,64,65,67,67]);
  assert.deepEqual(pitches.slice(-5),[62,62,62,62,60]);
  assert.deepEqual(song.measures.map(measure=>measure.reduce((beats,event)=>beats+event.duration,0)),Array(10).fill(4));
  assert.equal(song.events.at(-1).duration,4);
});

test('O du lieber Augustin is complete and follows the supplied score',()=>{
  const song=SONGS.find(song=>song.id==='o-du-lieber-augustin');
  assert.ok(song);
  const notes=song.events.filter(event=>event.type==='note');
  const rests=song.events.filter(event=>event.type==='rest');
  assert.equal(song.measures.length,16);
  assert.equal(notes.length,47);
  assert.equal(rests.length,2);
  assert.deepEqual(song.measures[0].map(event=>[event.midi,event.duration]),[[72,1.5],[74,.5],[72,.5],[70,.5]]);
  assert.deepEqual(song.measures.at(-1).map(event=>[event.type,event.midi,event.duration]),[['note',65,2],['rest',undefined,1]]);
  assert.deepEqual(song.measures.map(measure=>measure.reduce((beats,event)=>beats+event.duration,0)),Array(16).fill(3));
  const svg=songScoreSvg(song,0);
  assert.equal((svg.match(/>♭<\/text>/g)||[]).length,4);
  assert.match(svg,/b♭¹<\/text>/);
});

test('Song score marks completed, current and wrong notes',()=>{
  const song=SONGS[0];
  const svg=songScoreSvg(song,3,66);
  assert.equal((svg.match(/data-state="done"/g)||[]).length,3);
  assert.equal((svg.match(/data-state="current"/g)||[]).length,1);
  assert.equal((svg.match(/data-state="wrong"/g)||[]).length,1);
  assert.match(svg,/#c12d39/);
  assert.match(svg,/>c¹<\/text>/);
  assert.doesNotMatch(svg,/Schwänz|schwim|Köpf|Höh/);
});

test('Song score supports rests and different note values',()=>{
  const {note,rest}=rhythmExample;
  const measures=[[note(60,1),rest(1),note(62,2)]];
  const song={title:'Rhythmus',beatsPerMeasure:4,measures,events:measures.flat()};
  const svg=songScoreSvg(song,1);
  assert.match(svg,/aria-label="Viertelnote"/);
  assert.match(svg,/aria-label="d¹, halbe Note"/);
  assert.match(svg,/&#xE4E5;/);
  assert.match(svg,/font-family="Bravura"/);
});

test("He's a Pirate follows page 1 with four grand-staff systems",()=>{
  const song=SONGS.find(song=>song.id==='hes-a-pirate');
  assert.ok(song);
  assert.equal(song.measures.length,17);
  assert.equal(song.grandStaff,true);
  assert.deepEqual(song.timeSignature,{top:6,bottom:8});
  for(const measure of piratePage1Measures){
    assert.equal(measure.right.reduce((sum,event)=>sum+event.duration,0),3);
    assert.equal(measure.left.reduce((sum,event)=>sum+event.duration,0),3);
  }
  assert.deepEqual(piratePage1Measures.slice(0,4).map(measure=>measure.left[0].type),Array(4).fill('rest'));
  assert.deepEqual(eventMidis(song.events[0]),[62]);
  const barFive=song.events.filter(event=>event.measureIndex===4);
  assert.deepEqual(barFive[0].rightMidis,[62]);
  assert.deepEqual(barFive[0].leftMidis,[26,38]);
  assert.deepEqual(barFive[0].midis,[62,26,38]);
  assert.equal(barFive[0].x,1996);
  assert.ok(song.events.some(event=>event.rightMidis.length===0&&event.leftMidis.length>0));
  const svg=songScoreSvg(song,song.events.findIndex(event=>event.measureIndex===4));
  assert.equal((svg.match(/<image href="hes-a-pirate-system-/g)||[]).length,4);
  assert.match(svg,/Vier Systeme mit je einer Zeile für rechte und linke Hand/);
  assert.match(svg,/data-state="current"/);
  assert.match(svg,/data-hand="right" data-midi="62" cx="1996"/);
  assert.match(svg,/data-hand="left" data-midi="26" cx="1996"/);
});

test('Hand choice and per-note score feedback keep the selected staff precise',()=>{
  const song=SONGS.find(song=>song.id==='hes-a-pirate');
  const firstLeft=song.events.findIndex(event=>event.leftMidis.length);
  assert.equal(song.events[firstLeft].measureIndex,4);
  assert.deepEqual(practiceMidis(song.events[0],'left'),[]);
  assert.deepEqual(practiceMidis(song.events[firstLeft],'right'),[62]);
  assert.deepEqual(practiceMidis(song.events[firstLeft],'left'),[26,38]);
  const leftSvg=songScoreSvg(song,firstLeft,40,{hand:'left',correctMidis:new Set([26])});
  assert.match(leftSvg,/data-state="correct" data-hand="left" data-midi="26" cx="1996"/);
  assert.match(leftSvg,/data-state="current" data-hand="left" data-midi="38" cx="1996"/);
  assert.match(leftSvg,/data-state="wrong" data-midi="40"/);
  assert.doesNotMatch(leftSvg,/data-hand="right"/);
  const rightSvg=songScoreSvg(song,firstLeft,null,{hand:'right'});
  assert.match(rightSvg,/data-hand="right" data-midi="62" cx="1996"/);
  assert.doesNotMatch(rightSvg,/data-hand="left"/);
});

test('MIDI pitches are converted to notation notes',()=>{
  assert.equal(noteForMidi(60).name,'C');
  assert.deepEqual([noteForMidi(66).name,noteForMidi(66).accidental],['F','♯']);
  assert.equal(noteForMidi(71).name,'B');
  assert.equal(noteForMidi(70,true).name,'B');
  assert.equal(noteForMidi(70,true).accidental,'♭');
});
