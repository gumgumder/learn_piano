import {naturals,makePool,drawRound,staffSvg} from './music.js';
const $=id=>document.getElementById(id);
let round=[],index=0,revealed=false;
for(const note of naturals){for(const id of ['low','high']){const option=document.createElement('option');option.value=note.midi;option.textContent=`${note.letter}${note.octave}`;$(id).append(option);}}
$('low').value='60';$('high').value='79';
function valid(){const ok=Number($('low').value)<=Number($('high').value);$('range-error').hidden=ok;$('start').disabled=!ok;return ok;}
$('low').addEventListener('change',valid);$('high').addEventListener('change',valid);
function show(id){for(const section of ['setup','exercise','complete'])$(section).hidden=section!==id;}
function render(){
  const note=round[index];$('counter').textContent=`Note ${index+1} von 5`;
  $('progress').innerHTML=round.map((_,i)=>`<span class="${i<index?'done':i===index?'current':''}"></span>`).join('');
  $('staff').innerHTML=staffSvg(note);
  $('answer').replaceChildren();
  if(revealed){const name=document.createElement('strong');name.textContent=note.name;const octave=document.createElement('small');octave.textContent=`${note.name}${note.octave}`;$('answer').append(name,octave);}else $('answer').textContent='Erst überlegen, dann aufdecken.';
  $('next').textContent=revealed?(index===4?'Runde abschließen':'Nächste Note →'):'Lösung anzeigen';
}
function start(){if(!valid())return;round=drawRound(makePool(Number($('low').value),Number($('high').value),$('black').checked));index=0;revealed=false;show('exercise');render();$('next').focus();}
$('start').addEventListener('click',start);$('again').addEventListener('click',start);
$('next').addEventListener('click',()=>{if(!revealed){revealed=true;render();}else if(index<4){index++;revealed=false;render();}else{show('complete');$('again').focus();}});
for(const id of ['back','settings'])$(id).addEventListener('click',()=>{show('setup');$('start').focus();});
