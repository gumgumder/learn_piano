import {test} from 'node:test';
import assert from 'node:assert/strict';
import {keyEvent,midiName} from '../dist/midi.js';
test('Key strikes work on every MIDI channel',()=>{
  for(let channel=0;channel<16;channel++)assert.deepEqual(keyEvent([0x90|channel,60,100]),{note:60,channel,down:true});
});
test('Both MIDI release formats are releases, not answers',()=>{
  assert.equal(keyEvent([0x80,60,64]).down,false);
  assert.equal(keyEvent([0x90,60,0]).down,false);
  for(const data of [[0xb0,64,127],[0xf8],[0xc0,2],[],[0x90,60]])assert.equal(keyEvent(data),null);
});
test('German MIDI names preserve pitch and octave',()=>{
  assert.equal(midiName(60),'C4');assert.equal(midiName(84),'C6');
  assert.equal(midiName(70),'B4');assert.equal(midiName(71),'H4');assert.equal(midiName(66),'Fis4');
});
