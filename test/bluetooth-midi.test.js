import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeBleMidi} from '../dist/bluetooth-midi.js';
test('Decode key strikes and releases with BLE timestamps',()=>{
  assert.deepEqual(decodeBleMidi([0x80,0x81,0x90,60,100,0x82,0x80,60,0]),[[0x90,60,100],[0x80,60,0]]);
});
test('Running status with and without a new timestamp',()=>{
  assert.deepEqual(decodeBleMidi([0x80,0x81,0x91,60,100,64,90,0x82,67,80]),[[0x91,60,100],[0x91,64,90],[0x91,67,80]]);
});
test('Ignore realtime and reject incomplete data',()=>{
  assert.deepEqual(decodeBleMidi([0x80,0x81,0xf8,0x82,0x90,60,100]),[[0x90,60,100]]);
  assert.deepEqual(decodeBleMidi([0x80,0x81,0x90,60,0x82,0xf8,100]),[[0x90,60,100]]);
  for(const bytes of [[],[0x80],[0,0,0],[0x80,0x81,0x90,60],[0x80,0x81,0xf0,60,100]])assert.deepEqual(decodeBleMidi(bytes),[]);
});
test('Respect DataView offsets and zero-velocity releases',()=>{
  const buffer=new Uint8Array([0,0x80,0x81,0x90,60,0,0]);
  assert.deepEqual(decodeBleMidi(new DataView(buffer.buffer,1,5)),[[0x90,60,0]]);
});
