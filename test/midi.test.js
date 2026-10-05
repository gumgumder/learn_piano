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
test('German octave names cover the complete 88-key piano range',()=>{
  assert.equal(midiName(21),'A₂');assert.equal(midiName(23),'B₂');
  assert.equal(midiName(24),'C₁');assert.equal(midiName(36),'C');assert.equal(midiName(48),'c');
  assert.equal(midiName(60),'c¹');assert.equal(midiName(84),'c³');assert.equal(midiName(108),'c⁵');
  assert.equal(midiName(70),'a♯¹');assert.equal(midiName(71),'b¹');assert.equal(midiName(66),'f♯¹');
});
