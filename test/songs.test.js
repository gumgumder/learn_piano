import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SONGS,noteForMidi,rhythmExample,songScoreSvg} from '../dist/songs.js';

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
  assert.match(svg,/B<\/text>/);
});

test('Song score marks completed, current and wrong notes',()=>{
  const song=SONGS[0];
  const svg=songScoreSvg(song,3,66);
  assert.equal((svg.match(/data-state="done"/g)||[]).length,3);
  assert.equal((svg.match(/data-state="current"/g)||[]).length,1);
  assert.equal((svg.match(/data-state="wrong"/g)||[]).length,1);
  assert.match(svg,/#c12d39/);
  assert.match(svg,/>C<\/text>/);
  assert.doesNotMatch(svg,/Schwänz|schwim|Köpf|Höh/);
});

test('Song score supports rests and different note values',()=>{
  const {note,rest}=rhythmExample;
  const measures=[[note(60,1),rest(1),note(62,2)]];
  const song={title:'Rhythmus',beatsPerMeasure:4,measures,events:measures.flat()};
  const svg=songScoreSvg(song,1);
  assert.match(svg,/aria-label="Viertelnote"/);
  assert.match(svg,/aria-label="D, halbe Note"/);
  assert.match(svg,/&#xE4E5;/);
  assert.match(svg,/font-family="Bravura"/);
});

test('MIDI pitches are converted to notation notes',()=>{
  assert.equal(noteForMidi(60).name,'C');
  assert.equal(noteForMidi(66).name,'Fis');
  assert.equal(noteForMidi(71).name,'H');
  assert.equal(noteForMidi(70,true).name,'B');
});
