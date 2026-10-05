// Only actual key strikes count: ignore note-off, zero velocity, pedals and clocks.
export function keyEvent(data){
  if(!data||data.length<3)return null;
  const [status,note,velocity]=data,type=status&0xf0;
  if(note>127||velocity>127)return null;
  if(type===0x90)return {note,channel:status&15,down:velocity>0};
  if(type===0x80)return {note,channel:status&15,down:false};
  return null;
}
export function midiName(note){return formatMidiNote(note);}
import {formatMidiNote} from './note-names.js';
