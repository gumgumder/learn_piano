export const MIDI_SERVICE='03b80e5a-ede8-4b33-a751-6ce34ec4c700';
export const MIDI_CHARACTERISTIC='7772e5db-3868-4112-a1a9-f2669d106bf3';

// BLE-MIDI adds a packet header and timestamps to MIDI messages.
// This receive-only trainer decodes channel messages; SysEx is not used.
export function decodeBleMidi(value){
  const bytes=value instanceof DataView?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):value;
  if(bytes.length<3||!(bytes[0]&0x80)||!(bytes[1]&0x80))return [];
  const messages=[];let i=1,status=0;
  while(i<bytes.length){
    // At message boundaries a high-bit byte is a timestamp, not a MIDI status.
    if(bytes[i]&0x80)i++;
    if(i>=bytes.length)break;
    if(bytes[i]&0x80){
      const next=bytes[i++];
      if(next>=0xf8)continue;
      if(next>=0xf0)return messages; // Do not interpret SysEx payloads as keys.
      status=next;
    }
    if(!status)return messages;
    const length=(status&0xf0)===0xc0||(status&0xf0)===0xd0?1:2;
    const data=[];
    while(data.length<length&&i<bytes.length){
      if(bytes[i]&0x80){
        // A timestamp and real-time message may interrupt a channel message.
        if(i+1<bytes.length&&bytes[i+1]>=0xf8){i+=2;continue;}
        return messages;
      }
      data.push(bytes[i++]);
    }
    if(data.length!==length)return messages;
    messages.push([status,...data]);

  }
  return messages;
}

export async function withTimeout(promise,ms=15000){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Bluetooth-Zeitüberschreitung')),ms);})]);}
  finally{clearTimeout(timer);}
}
