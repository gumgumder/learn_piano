import {formatGermanNote,PIANO_HIGH_MIDI,PIANO_LOW_MIDI} from './note-names.js';

export const LETTERS=['C','D','E','F','G','A','B'];
const SEMITONES=[0,2,4,5,7,9,11];
export const naturals=Array.from({length:PIANO_HIGH_MIDI-PIANO_LOW_MIDI+1},(_,i)=>PIANO_LOW_MIDI+i)
  .filter(midi=>SEMITONES.includes(midi%12))
  .map(midi=>{
    const octave=Math.floor(midi/12)-1,index=SEMITONES.indexOf(midi%12);
    return {letter:LETTERS[index],name:LETTERS[index],octave,step:octave*7+index,midi,accidental:''};
  });
export function makePool(low,high,black){
  const notes=[];
  for(let midi=low;midi<=high;midi++){
    const octave=Math.floor(midi/12)-1,pc=midi%12,index=SEMITONES.indexOf(pc);
    if(index>=0)notes.push([{name:LETTERS[index],octave,step:octave*7+index,midi,accidental:''}]);
    else if(black){
      const below=SEMITONES.findLastIndex(n=>n<pc),above=below+1;
      notes.push([{name:LETTERS[below],octave,step:octave*7+below,midi,accidental:'♯'},{name:LETTERS[above],octave,step:octave*7+above,midi,accidental:'♭'}]);
    }
  }
  return notes;
}
export function drawRound(pool,count=5,random=Math.random){
  if(!pool.length)throw new Error('Leerer Tonbereich');
  let previous=-1;
  return Array.from({length:count},()=>{
    const choices=pool.length>1?pool.filter(p=>p[0].midi!==previous):pool;
    const variants=choices[Math.floor(random()*choices.length)];
    const note=variants[Math.floor(random()*variants.length)];previous=note.midi;return note;
  });
}
export function staffSvg(note,playedNote=null,clef='treble'){
  // Bottom line: E4 in treble (step 30), G2 in bass (step 18).
  const bottomStep=clef==='bass'?18:30;
  const noteY=n=>160-(n.step-bottomStep)*10;
  const line=(y,x1=28,x2=332)=>`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="currentColor" stroke-width="1.2"/>`;
  function glyph(n,x){
    const y=noteY(n);
    let ledgers='';
    for(let s=bottomStep-2;s>=n.step;s-=2)ledgers+=line(noteY({step:s}),x-23,x+23);
    for(let s=bottomStep+10;s<=n.step;s+=2)ledgers+=line(noteY({step:s}),x-23,x+23);
    const down=n.step>=bottomStep+4,stemX=x+(down?-11:11);
    const stem=`<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${y+(down?65:-65)}" stroke="currentColor" stroke-width="2"/>`;
    return `${ledgers}${n.accidental?`<text x="${x-45}" y="${y+10}" font-family="serif" font-size="34">${n.accidental}</text>`:''}<ellipse cx="${x}" cy="${y}" rx="12" ry="8.5" transform="rotate(-20 ${x} ${y})" fill="currentColor"/>${stem}`;
  }
  const clefName=clef==='bass'?'Bassschlüssel':'Violinschlüssel';
  const description=playedNote?`${clefName}. Gesucht: ${formatGermanNote(note)}. Rot daneben gespielt: ${formatGermanNote(playedNote)}.`:`Eine Note im ${clefName}. Die Lösung lässt sich aufdecken oder am Klavier spielen.`;
  const clefGlyph=clef==='bass'?'&#xE062;':'&#xE050;';
  const clefY=clef==='bass'?100:140;
  // Keep the normal frame stable, but expand it when an outer piano key needs more ledger lines.
  const shown=[note,playedNote].filter(Boolean),top=Math.min(-50,...shown.map(n=>noteY(n)-75)),bottom=Math.max(280,...shown.map(n=>noteY(n)+75));
  return `<svg viewBox="0 ${top} 360 ${bottom-top}" role="img" aria-label="${description}" style="color:#203943">${[80,100,120,140,160].map(v=>line(v)).join('')}<text x="43" y="${clefY}" font-family="Bravura" font-size="80">${clefGlyph}</text><g data-note="target">${glyph(note,228)}</g>${playedNote?`<g data-note="played" style="color:#c12d39">${glyph(playedNote,306)}</g>`:''}</svg>`;
}
