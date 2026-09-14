export const LETTERS=['C','D','E','F','G','A','H'];
const SEMITONES=[0,2,4,5,7,9,11];
export const naturals=Array.from({length:29},(_,i)=>({letter:LETTERS[i%7],octave:3+Math.floor(i/7),step:i+21,midi:12*(4+Math.floor(i/7))+SEMITONES[i%7]}));
export function makePool(low,high,black){
  const notes=[];
  for(let midi=low;midi<=high;midi++){
    const octave=Math.floor(midi/12)-1,pc=midi%12,index=SEMITONES.indexOf(pc);
    if(index>=0)notes.push([{name:LETTERS[index],octave,step:octave*7+index,midi,accidental:''}]);
    else if(black){
      const below=SEMITONES.findLastIndex(n=>n<pc),above=below+1;
      const sharpNames=['Cis','Dis','','Fis','Gis','Ais'];
      const flatNames={1:'Des',2:'Es',4:'Ges',5:'As',6:'B'};
      notes.push([{name:sharpNames[below],octave,step:octave*7+below,midi,accidental:'♯'},{name:flatNames[above],octave,step:octave*7+above,midi,accidental:'♭'}]);
    }
  }
  return notes;
}
export function drawRound(pool,random=Math.random){
  if(!pool.length)throw new Error('Leerer Tonbereich');
  let previous=-1;
  return Array.from({length:5},()=>{
    const choices=pool.length>1?pool.filter(p=>p[0].midi!==previous):pool;
    const variants=choices[Math.floor(random()*choices.length)];
    const note=variants[Math.floor(random()*variants.length)];previous=note.midi;return note;
  });
}
export function staffSvg(note){
  // E4 = bottom line (y=160); G4 = treble-clef anchor (y=140).
  const y=160-(note.step-30)*10;
  const line=(y,x1=28,x2=332)=>`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="currentColor" stroke-width="1.2"/>`;
  let ledgers='';for(let s=28;s>=note.step;s-=2)ledgers+=line(160-(s-30)*10,205,251);
  for(let s=40;s<=note.step;s+=2)ledgers+=line(160-(s-30)*10,205,251);
  const stem=note.step>=34?`<line x1="217" y1="${y}" x2="217" y2="${y+65}" stroke="currentColor" stroke-width="2"/>`:`<line x1="239" y1="${y}" x2="239" y2="${y-65}" stroke="currentColor" stroke-width="2"/>`;
  return `<svg viewBox="0 ${Math.min(15,y-80)} 360 ${Math.max(225,y+80)-Math.min(15,y-80)}" role="img" aria-label="Eine Note im Violinschlüssel. Die Lösung lässt sich mit dem Button aufdecken." style="color:#203943">${[80,100,120,140,160].map(v=>line(v)).join('')}<text x="43" y="140" font-family="Bravura" font-size="80">&#xE050;</text>${ledgers}${note.accidental?`<text x="183" y="${y+10}" font-family="serif" font-size="34">${note.accidental}</text>`:''}<ellipse cx="228" cy="${y}" rx="12" ry="8.5" transform="rotate(-20 228 ${y})" fill="currentColor"/>${stem}</svg>`;
}
