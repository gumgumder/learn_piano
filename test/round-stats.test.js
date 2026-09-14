import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAnswers} from '../dist/round-stats.js';
test('Average includes both correct and incorrect answers',()=>{
  assert.deepEqual(summarizeAnswers([{correct:true,durationMs:1000},{correct:false,durationMs:3000},{correct:true,durationMs:2000}]),{correct:2,total:3,averageMs:2000});
});
test('Single-note and empty rounds have defined statistics',()=>{
  assert.deepEqual(summarizeAnswers([{correct:false,durationMs:750}]),{correct:0,total:1,averageMs:750});
  assert.deepEqual(summarizeAnswers([]),{correct:0,total:0,averageMs:0});
});
