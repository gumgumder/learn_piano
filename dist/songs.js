import {makePool} from './music.js';
import {combineHands,piratePage1Measures} from './pirate-page1.js?v=20260927-hands';
import {formatGermanNote} from './note-names.js';

const note=(midi,duration,lyric)=>({type:'note',midi,duration,lyric});
const chord=(midis,duration)=>({type:'chord',midis,duration});
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

const pirateEvents=combineHands(piratePage1Measures);

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
},{
  id:'hes-a-pirate',
  title:"He's a Pirate – Seite 1",
  detail:'17 Takte · beide Hände · Akkorde · d-Moll · 6/8-Takt',
  tempo:200,
  beatsPerMeasure:3,
  timeSignature:{top:6,bottom:8},
  keySignature:'F',
  preferFlats:true,
  grandStaff:true,
  measures:piratePage1Measures,
  events:pirateEvents,
}];

export function eventMidis(event){
  if(event.type==='chord')return event.midis;
  return event.type==='note'?[event.midi]:[];
}

export function practiceMidis(event,hand='both'){
  if(!event)return [];
  if(!('rightMidis' in event))return eventMidis(event);
  if(hand==='right')return event.rightMidis;
  if(hand==='left')return event.leftMidis;
  return event.midis;
}

export function noteForMidi(midi,preferFlats=false){
  const spellings=makePool(midi,midi,true)[0];
  return spellings?.[preferFlats?spellings.length-1:0]||null;
}

function durationName(duration){
  return {0.5:'Achtelnote',1:'Viertelnote',1.5:'punktierte Viertelnote',2:'halbe Note',4:'ganze Note'}[duration]||`${duration} Schläge`;
}

export function songScoreSvg(song,currentIndex,wrongMidi=null,options={}){
  if(song.grandStaff)return piratePageScoreSvg(song,currentIndex,wrongMidi,options);
  const measuresPerSystem=4,measureWidth=245,width=1120,lineGap=105;
  const measureDuration=song.measureDuration||song.beatsPerMeasure;
  const signature=song.timeSignature||{top:song.beatsPerMeasure,bottom:4};
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
    const pitches=eventMidis(event).map(pitchForMidi);
    const ys=pitches.map(pitch=>bottom-(pitch.step-30)*6);
    const down=Math.max(...pitches.map(pitch=>pitch.step))>=34;
    const stemX=x+(down?-7:7),hasStem=event.duration<4,open=event.duration>=2;
    let notes='';
    pitches.forEach((pitch,index)=>{
      const y=ys[index];
      for(let step=28;step>=pitch.step;step-=2)notes+=line(x-15,bottom-(step-30)*6,x+15,colour,1.2);
      for(let step=40;step<=pitch.step;step+=2)notes+=line(x-15,bottom-(step-30)*6,x+15,colour,1.2);
      if(pitch.accidental&&!(song.keySignature==='F'&&pitch.name==='B'))notes+=`<text x="${x-25-index*3}" y="${y+6}" font-family="serif" font-size="21" fill="${colour}">${pitch.accidental}</text>`;
      notes+=`<ellipse cx="${x}" cy="${y}" rx="8" ry="5.5" transform="rotate(-20 ${x} ${y})" fill="${open?'white':colour}" stroke="${colour}" stroke-width="${open?2.2:0}"/>`;
    });
    const stemY=down?Math.min(...ys):Math.max(...ys);
    const stem=hasStem?`<line x1="${stemX}" y1="${stemY}" x2="${stemX}" y2="${stemY+(down?38:-38)}" stroke="${colour}" stroke-width="1.7"/>`:'';
    const flag=event.duration===0.5?`<path d="M ${stemX} ${stemY+(down?38:-38)} q ${down?-15:15} ${down?-5:5} ${down?-12:12} ${down?-22:22}" fill="none" stroke="${colour}" stroke-width="2.4"/>`:'';
    const dot=event.duration===1.5?`<circle cx="${x+14}" cy="${ys[Math.floor(ys.length/2)]}" r="2.4" fill="${colour}"/>`:'';
    return `<g ${extra}>${notes}${stem}${flag}${dot}</g>`;
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
    if(system===0)body+=`<text x="87" y="${top+24}" font-family="Bravura" font-size="29" fill="#203943">${signature.top}</text><text x="87" y="${top+49}" font-family="Bravura" font-size="29" fill="#203943">${signature.bottom}</text>`;
    for(let local=0;local<measuresPerSystem;local++){
      const measureIndex=measureStartIndex+local;
      if(measureIndex>=song.measures.length)break;
      const x0=staffStart+local*measureWidth;
      if(local===0)body+=vline(x0,top,bottom,'#64777e',1.2);
      let beat=0;
      for(const event of song.measures[measureIndex]){
        const x=x0+(beat+event.duration/2)/measureDuration*measureWidth;
        const state=eventIndex<currentIndex?'done':eventIndex===currentIndex?'current':'future';
        const colour=state==='done'?'#27834d':state==='current'?'#1c4d59':'#8a989e';
        const pitches=eventMidis(event).map(pitchForMidi);
        const pitchNames=[...new Set(pitches.map(formatGermanNote))].join('–');
        const ys=pitches.map(pitch=>bottom-(pitch.step-30)*6);
        if(state==='current'){
          const y=event.type==='rest'?bottom-24:(Math.min(...ys)+Math.max(...ys))/2;
          const h=event.type==='rest'?32:Math.max(32,Math.max(...ys)-Math.min(...ys)+24);
          body+=`<rect x="${x-17}" y="${y-h/2}" width="34" height="${h}" rx="17" fill="#dcecee"/>`;
        }
        if(event.type!=='rest')body+=`<text x="${x}" y="${top-11}" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="13" font-weight="700" fill="${colour}">${pitchNames}</text>`;
        const label=event.type==='rest'
          ? durationName(event.duration)
          : event.type==='chord'
            ? `Akkord ${pitches.map(formatGermanNote).join(', ')}, ${durationName(event.duration)}`
            : `${formatGermanNote(pitches[0])}, ${durationName(event.duration)}`;
        body+=glyph(event,x,bottom,colour,`data-index="${eventIndex}" data-state="${state}" aria-label="${label}"`);
        if(state==='current'&&wrongMidi!==null)body+=glyph(note(wrongMidi,1),x+21,bottom,'#c12d39','data-state="wrong"');
        beat+=event.duration;eventIndex++;
      }
      body+=vline(x0+measureWidth,top,bottom,'#64777e',measureIndex===song.measures.length-1?3:1.2);
    }
  }
  const current=Math.min(currentIndex+1,song.events.length);
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${song.title}. Ereignis ${current} von ${song.events.length} ist markiert.">${body}</svg>`;
}

function piratePageScoreSvg(song,currentIndex,wrongMidi,{hand='both',correctMidis=new Set()}={}){
  const heights=[620,540,540,540],starts=[0,5,9,13];
  const staffBottoms=[[260,493],[172,406],[175,409],[168,401]];
  const event=song.events[currentIndex];
  const totalHeight=heights.reduce((sum,height)=>sum+height,0);
  let offset=0,body='';
  for(let system=0;system<4;system++){
    const height=heights[system], [trebleBottom,bassBottom]=staffBottoms[system];
    body+=`<image href="hes-a-pirate-system-${system+1}.png" x="0" y="${offset}" width="2400" height="${height}"/>`;
    if(hand==='right')body+=`<rect x="0" y="${offset+bassBottom-116}" width="2400" height="${height-bassBottom+116}" fill="white" fill-opacity=".63"/>`;
    if(hand==='left'){
      const dimTop=Math.max(0,trebleBottom-144),dimBottom=bassBottom-112;
      body+=`<rect x="0" y="${offset+dimTop}" width="2400" height="${dimBottom-dimTop}" fill="white" fill-opacity=".63"/>`;
    }
    if(event&&event.measureIndex>=starts[system]&&event.measureIndex<starts[system]+(system===0?5:4)){
      const yFor=(midi,targetHand)=>{
        const pitch=noteForMidi(midi,song.preferFlats);
        return offset+(targetHand==='left'?bassBottom-(pitch.step-18)*11.7:trebleBottom-(pitch.step-30)*11.7);
      };
      const activeHands=hand==='both'?['right','left']:[hand];
      for(const activeHand of activeHands){
        for(const midi of event[`${activeHand}Midis`]){
          const y=yFor(midi,activeHand),correct=correctMidis.has(midi);
          body+=`<ellipse data-state="${correct?'correct':'current'}" data-hand="${activeHand}" data-midi="${midi}" cx="${event.x}" cy="${y}" rx="20" ry="15" fill="${correct?'#35b96e':'#52b5c7'}" fill-opacity=".23" stroke="${correct?'#178746':'#14798a'}" stroke-width="4"/>`;
        }
      }
      if(wrongMidi!==null){
        let wrongHand=hand;
        if(hand==='both'){
          const nearest=which=>Math.min(...event[`${which}Midis`].map(midi=>Math.abs(midi-wrongMidi)),Infinity);
          wrongHand=nearest('left')<nearest('right')?'left':'right';
        }
        const y=yFor(wrongMidi,wrongHand),pitch=noteForMidi(wrongMidi,song.preferFlats);
        body+=`<g data-state="wrong" data-midi="${wrongMidi}"><ellipse cx="${event.x}" cy="${y}" rx="21" ry="16" fill="#f76464" fill-opacity=".23" stroke="#c12d39" stroke-width="4"/><text x="${event.x+29}" y="${y+7}" fill="#a51f2d" font-family="DM Sans, sans-serif" font-size="27" font-weight="700">${formatGermanNote(pitch)} ✕</text></g>`;
      }
    }
    offset+=height;
  }
  return `<svg viewBox="0 0 2400 ${totalHeight}" role="img" aria-label="${song.title}. Vier Systeme mit je einer Zeile für rechte und linke Hand. Einsatz ${Math.min(currentIndex+1,song.events.length)} von ${song.events.length} ist markiert.">${body}</svg>`;
}

export const rhythmExample={note,chord,rest};
