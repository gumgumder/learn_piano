import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePool,drawRound,staffSvg} from '../dist/music.js';
test('German names and chromatic range',()=>{const pool=makePool(60,72,true);assert.equal(pool.length,13);assert.deepEqual(pool[10].map(n=>n.name),['Ais','B']);assert.equal(pool[11][0].name,'H');assert.ok(pool.flat().every(n=>n.name));assert.equal(makePool(60,72,false).length,8);});
test('Five notes stay in range, even with a single available note',()=>{for(let n=0;n<100;n++){const round=drawRound(makePool(60,79,true));assert.equal(round.length,5);assert.ok(round.every(n=>n.midi>=60&&n.midi<=79));assert.ok(round.every((n,i)=>i===0||n.midi!==round[i-1].midi));}assert.ok(drawRound(makePool(60,60,false)).every(n=>n.name==='C'));});
test('Middle C has a ledger line and E4 sits on the bottom staff line',()=>{assert.match(staffSvg(makePool(60,60,false)[0][0]),/y1="180" x2="251"/);assert.match(staffSvg(makePool(64,64,false)[0][0]),/cy="160"/);});
