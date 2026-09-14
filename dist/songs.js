import {makePool} from './music.js';

const note=(midi,duration,lyric)=>({type:'note',midi,duration,lyric});
const rest=duration=>({type:'rest',duration});

const duckMeasures=[
  [note(60,1,'Al'),note(62,1,'le'),note(64,1,'mei'),note(65,1,'ne')],
  [note(67,2,'Ent'),note(67,2,'chen')],
  [note(69,1,'schwim'),note(69,1,'men'),note(69,1,'auf'),note(69,1,'dem')],
  [note(67,4,'See,')],
  [note(69,1,'schwim'),note(69,1,'men'),note(69,1,'auf'),note(69,1,'dem')],
  [note(67,4,'See,')],
  [note(65,1,'Köpf'),note(65,1,'chen'),note(65,1,'in'),note(65,1,'das')],
  [note(64,2,'Was'),note(64,2,'ser,')],
  [note(62,1,'Schwänz'),note(62,1,'chen'),note(62,1,'in'),note(62,1,'die')],
  [note(60,4,'Höh’')],
];

const augustinMeasures=[
  [note(72,1.5),note(74,.5),note(72,.5),note(70,.5)],
  [note(69,1),note(65,1),note(65,1)],
  [note(67,1),note(60,1),note(60,1)],
  [note(69,1),note(65,1),note(65,1)],
  [note(72,1.5),note(74,.5),note(72,.5),note(70,.5)],
  [note(69,1),note(65,1),note(65,1)],
  [note(67,1),note(60,1),note(60,1)],
  [note(65,2),rest(1)],
  [note(67,1),note(60,1),note(60,1)],
  [note(69,1),note(65,1),note(65,1)],
  [note(67,1),note(60,1),note(60,1)],
  [note(69,1),note(65,1),note(65,1)],
  [note(72,1.5),note(74,.5),note(72,.5),note(70,.5)],
  [note(69,1),note(65,1),note(65,1)],
  [note(67,1),note(60,1),note(60,1)],
  [note(65,2),rest(1)],
];

export const SONGS=[{
  id:'alle-meine-entchen',
  title:'Alle meine Entchen',
  detail:'27 Noten · C-Dur · 4/4-Takt',
  tempo:100,
  beatsPerMeasure:4,
  measures:duckMeasures,
  events:duckMeasures.flat(),
},{
  id:'o-du-lieber-augustin',
  title:'O du lieber Augustin',
  detail:'47 Noten · F-Dur · 3/4-Takt',
  tempo:150,
  beatsPerMeasure:3,
  keySignature:'F',
  preferFlats:true,
  measures:augustinMeasures,
  events:augustinMeasures.flat(),
}];

export function noteForMidi(midi,preferFlats=false){
  const spellings=makePool(midi,midi,true)[0];
  return spellings?.[preferFlats?spellings.length-1:0]||null;
}

function durationName(duration){
  return {0.5:'Achtelnote',1:'Viertelnote',1.5:'punktierte Viertelnote',2:'halbe Note',4:'ganze Note'}[duration]||`${duration} Schläge`;
}

export function songScoreSvg(song,currentIndex,wrongMidi=null){
  const measuresPerSystem=4,measureWidth=245,width=1120,lineGap=105;
  const systems=Math.ceil(song.measures.length/measuresPerSystem),height=systems*lineGap+4;
  const line=(x1,y,x2,colour='currentColor',stroke=1)=>`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${colour}" stroke-width="${stroke}"/>`;
  const vline=(x,y1,y2,colour='currentColor',stroke=1)=>`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${colour}" stroke-width="${stroke}"/>`;
  const pitchForMidi=midi=>noteForMidi(midi,song.preferFlats);
  const glyph=(event,x,bottom,colour,extra='')=>{
    if(event.type==='rest'){
      const y=bottom-24;
      if(event.duration===4)return `<g ${extra}><rect x="${x-9}" y="${y}" width="18" height="6" fill="${colour}"/></g>`;
      if(event.duration===2)return `<g ${extra}><rect x="${x-9}" y="${y-6}" width="18" height="6" fill="${colour}"/></g>`;
      const code=event.duration===0.5?'&#xE4E6;':'&#xE4E5;';
      return `<g ${extra}><text x="${x-9}" y="${y+13}" font-family="Bravura" font-size="31" fill="${colour}">${code}</text></g>`;
    }
    const pitch=pitchForMidi(event.midi),y=bottom-(pitch.step-30)*6;
    let ledgers='';
    for(let step=28;step>=pitch.step;step-=2)ledgers+=line(x-15,bottom-(step-30)*6,x+15,colour,1.2);
    for(let step=40;step<=pitch.step;step+=2)ledgers+=line(x-15,bottom-(step-30)*6,x+15,colour,1.2);
    const down=pitch.step>=34,stemX=x+(down?-7:7),hasStem=event.duration<4;
    const accidental=pitch.accidental&&!(song.keySignature==='F'&&pitch.name==='B')?`<text x="${x-25}" y="${y+6}" font-family="serif" font-size="21" fill="${colour}">${pitch.accidental}</text>`:'';
    const open=event.duration>=2;
    const head=`<ellipse cx="${x}" cy="${y}" rx="8" ry="5.5" transform="rotate(-20 ${x} ${y})" fill="${open?'white':colour}" stroke="${colour}" stroke-width="${open?2.2:0}"/>`;
    const stem=hasStem?`<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${y+(down?38:-38)}" stroke="${colour}" stroke-width="1.7"/>`:'';
    const flag=event.duration===0.5?`<path d="M ${stemX} ${y+(down?38:-38)} q ${down?-15:15} ${down?-5:5} ${down?-12:12} ${down?-22:22}" fill="none" stroke="${colour}" stroke-width="2.4"/>`:'';
    const dot=event.duration===1.5?`<circle cx="${x+14}" cy="${y}" r="2.4" fill="${colour}"/>`:'';
    return `<g ${extra}>${ledgers}${accidental}${head}${stem}${flag}${dot}</g>`;
  };
  let body='',eventIndex=0;
  for(let system=0;system<systems;system++){
    const top=system*lineGap+25,bottom=top+48,staffStart=108;
    const measureStartIndex=system*measuresPerSystem;
    const measureCount=Math.min(measuresPerSystem,song.measures.length-measureStartIndex);
    const staffEnd=staffStart+measureCount*measureWidth;
    for(let i=0;i<5;i++)body+=line(18,top+i*12,staffEnd,'#64777e',1);
    body+=`<text x="25" y="${top+38}" font-family="Bravura" font-size="53" fill="#203943">&#xE050;</text>`;
    if(song.keySignature==='F')body+=`<text x="69" y="${top+31}" font-family="serif" font-size="25" fill="#203943">♭</text>`;
    if(system===0)body+=`<text x="87" y="${top+24}" font-family="Bravura" font-size="29" fill="#203943">${song.beatsPerMeasure}</text><text x="87" y="${top+49}" font-family="Bravura" font-size="29" fill="#203943">4</text>`;
    for(let local=0;local<measuresPerSystem;local++){
      const measureIndex=measureStartIndex+local;
      if(measureIndex>=song.measures.length)break;
      const x0=staffStart+local*measureWidth;
      if(local===0)body+=vline(x0,top,bottom,'#64777e',1.2);
      let beat=0;
      for(const event of song.measures[measureIndex]){
        const x=x0+(beat+event.duration/2)/song.beatsPerMeasure*measureWidth;
        const state=eventIndex<currentIndex?'done':eventIndex===currentIndex?'current':'future';
        const colour=state==='done'?'#27834d':state==='current'?'#1c4d59':'#8a989e';
        if(state==='current')body+=`<circle cx="${x}" cy="${event.type==='note'?bottom-(pitchForMidi(event.midi).step-30)*6:bottom-24}" r="16" fill="#dcecee"/>`;
        if(event.type==='note')body+=`<text x="${x}" y="${top-11}" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="14" font-weight="700" fill="${colour}">${pitchForMidi(event.midi).name}</text>`;
        body+=glyph(event,x,bottom,colour,`data-index="${eventIndex}" data-state="${state}" aria-label="${event.type==='note'?`${pitchForMidi(event.midi).name}, ${durationName(event.duration)}`:durationName(event.duration)}"`);
        if(state==='current'&&wrongMidi!==null)body+=glyph(note(wrongMidi,1),x+21,bottom,'#c12d39','data-state="wrong"');
        beat+=event.duration;eventIndex++;
      }
      body+=vline(x0+measureWidth,top,bottom,'#64777e',measureIndex===song.measures.length-1?3:1.2);
    }
  }
  const current=Math.min(currentIndex+1,song.events.length);
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${song.title}. Ereignis ${current} von ${song.events.length} ist markiert.">${body}</svg>`;
}

export const rhythmExample={note,rest};
