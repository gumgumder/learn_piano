// Only actual key strikes count: ignore note-off, zero velocity, pedals and clocks.
export function keyEvent(data){
  if(!data||data.length<3)return null;
  const [status,note,velocity]=data,type=status&0xf0;
  if(note>127||velocity>127)return null;
  if(type===0x90)return {note,channel:status&15,down:velocity>0};
  if(type===0x80)return {note,channel:status&15,down:false};
  return null;
}
export function midiName(note){return ['C','Cis','D','Dis','E','F','Fis','G','Gis','A','B','H'][note%12]+(Math.floor(note/12)-1);}
