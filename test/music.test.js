import {test} from 'node:test';
import assert from 'node:assert/strict';
import {naturals,makePool,drawRound,staffSvg} from '../dist/music.js';
import {formatGermanNote} from '../dist/note-names.js';
test('German names and chromatic range',()=>{const pool=makePool(60,72,true);assert.equal(pool.length,13);assert.deepEqual(pool[10].map(n=>[n.name,n.accidental]),[['A','♯'],['B','♭']]);assert.equal(pool[11][0].name,'B');assert.ok(pool.flat().every(n=>n.name));assert.equal(makePool(60,72,false).length,8);});
test('Natural piano notes run from A₂ through c⁵',()=>{
  assert.equal(naturals.length,52);
  assert.equal(formatGermanNote(naturals[0]),'A₂');
  assert.equal(formatGermanNote(naturals.at(-1)),'c⁵');
});
test('Five notes stay in range, even with a single available note',()=>{for(let n=0;n<100;n++){const round=drawRound(makePool(60,79,true));assert.equal(round.length,5);assert.ok(round.every(n=>n.midi>=60&&n.midi<=79));assert.ok(round.every((n,i)=>i===0||n.midi!==round[i-1].midi));}assert.ok(drawRound(makePool(60,60,false)).every(n=>n.name==='C'));});
test('Middle C has a ledger line and E4 sits on the bottom staff line',()=>{assert.match(staffSvg(makePool(60,60,false)[0][0]),/y1="180" x2="251"/);assert.match(staffSvg(makePool(64,64,false)[0][0]),/cy="160"/);});
test('Bass clef places F3 on its reference line and G2 on the bottom line',()=>{
  const f3=staffSvg(makePool(53,53,false)[0][0],null,'bass');
  const g2=staffSvg(makePool(43,43,false)[0][0],null,'bass');
  const c4=staffSvg(makePool(60,60,false)[0][0],null,'bass');
  const c2=staffSvg(makePool(36,36,false)[0][0],null,'bass');
  const c5=staffSvg(makePool(72,72,false)[0][0],null,'bass');
  assert.match(f3,/&#xE062;/);
  assert.match(f3,/cx="228" cy="100"/);
  assert.match(g2,/cx="228" cy="160"/);
  assert.match(c4,/y1="60" x2="251"/);
  assert.match(c4,/cx="228" cy="60"/);
  assert.match(c2,/cx="228" cy="200"/);
  assert.match(c5,/cx="228" cy="-10"/);
  assert.match(c4,/viewBox="0 -50 360 330"/);
});
test('Staff framing keeps the target column fixed and expands for outer piano keys',()=>{
  const notes=[48,60,84,96].map(midi=>makePool(midi,midi,false)[0][0]);
  for(const note of notes){
    assert.match(staffSvg(note),/<g data-note="target">.*?<ellipse cx="228"/);
  }
  assert.match(staffSvg(makePool(21,21,false)[0][0],null,'bass'),/viewBox="0 -50 360 415"/);
  assert.match(staffSvg(makePool(108,108,false)[0][0]),/viewBox="0 -175 360 455"/);
});
test('Wrong note appears separately at its true pitch, including accidentals',()=>{
  const target=makePool(65,65,false)[0][0],played=makePool(68,68,true)[0][0];
  const svg=staffSvg(target,played);
  assert.match(svg,/cx="228" cy="150"/);
  assert.match(svg,/data-note="played" style="color:#c12d39"/);
  assert.match(svg,/cx="306" cy="140"/);
  assert.match(svg,/♯/);
  assert.doesNotMatch(staffSvg(target),/data-note="played"/);
});
