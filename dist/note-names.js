const SUPERSCRIPT={1:'¹',2:'²',3:'³',4:'⁴',5:'⁵'};
const SUBSCRIPT={1:'₁',2:'₂'};
const SHARP_NAMES=['C','C','D','D','E','F','F','G','G','A','A','B'];
const SHARP_ACCIDENTALS=['','♯','','♯','','','♯','','♯','','♯',''];
const FLAT_NAMES=['C','D','D','E','E','F','G','G','A','A','B','B'];
const FLAT_ACCIDENTALS=['','♭','','♭','','','♭','','♭','','♭',''];

export const PIANO_LOW_MIDI=21;
export const PIANO_HIGH_MIDI=108;

export function germanOctaveSuffix(octave){
  if(octave<=1)return SUBSCRIPT[2-octave]||'';
  if(octave<=3)return '';
  return SUPERSCRIPT[octave-3]||String(octave-3);
}

export function formatGermanNote(note){
  if(!note)return '';
  const letter=note.octave>=3?note.name.toLowerCase():note.name.toUpperCase();
  return `${letter}${note.accidental||''}${germanOctaveSuffix(note.octave)}`;
}

export function noteForMidiName(midi,preferFlats=false){
  const pitchClass=((midi%12)+12)%12;
  return {
    name:(preferFlats?FLAT_NAMES:SHARP_NAMES)[pitchClass],
    accidental:(preferFlats?FLAT_ACCIDENTALS:SHARP_ACCIDENTALS)[pitchClass],
    octave:Math.floor(midi/12)-1,
    midi,
  };
}

export function formatMidiNote(midi,preferFlats=false){
  return formatGermanNote(noteForMidiName(midi,preferFlats));
}
