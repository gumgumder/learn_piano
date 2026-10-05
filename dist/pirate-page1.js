// Page 1 of Joseph M. Rozell's piano arrangement: four systems, 17 bars.
// Each bar contains independent right- and left-hand voices. Durations use
// quarter-note units, so one 6/8 bar contains three units.
const n=(midi,duration)=>({type:'note',midi,duration});
const c=(midis,duration)=>({type:'chord',midis,duration});
const r=duration=>({type:'rest',duration});

const d4=n(62,1),d8=n(62,.5);
const introA=()=>[d4,d8,d4,d8];
const introB=()=>[d4,d8,d8,d8,d8];
const bass=(low,high)=>[c([low,high],1),c([low,high],.5),c([low,high],1),c([low,high],.5)];

export const piratePage1Measures=[
  {right:introA(),left:[r(3)]},
  {right:introB(),left:[r(3)]},
  {right:introA(),left:[r(3)]},
  {right:introB(),left:[r(3)]},
  {right:introA(),left:[c([26,38],3)]},

  {right:[n(62,1),n(62,.5),n(62,.5),n(57,.5),n(60,.5)],left:[c([26,38],1.5),c([26,38],1.5)]},
  {right:[c([53,57,62],1),c([53,57,62],1),c([53,57,62],.5),c([57,60,64],.5)],left:[c([38,50],1),c([38,50],.5),c([38,50],1),c([36,48],.5)]},
  {right:[c([58,62,65],1),c([58,62,65],1),c([58,62,65],.5),c([62,67],.5)],left:bass(34,46)},
  {right:[c([57,60,64],1),c([57,60,64],1),c([57,62],.5),c([55,60],.5)],left:bass(33,45)},

  {right:[c([57,60],.5),c([57,62],1),r(.5),n(57,.5),n(60,.5)],left:bass(38,50)},
  {right:[c([53,57,62],1),c([53,57,62],1),c([57,62],.5),c([57,64],.5)],left:bass(34,46)},
  {right:[c([53,57,60],1),c([53,57,60],1),c([57,60],.5),c([57,62],.5)],left:bass(26,38)},
  {right:[c([57,60],1),c([57,60],1),c([53,58],.5),n(57,.5)],left:[c([36,48],1),c([36,48],.5),c([33,45],1),c([33,45],.5)]},

  {right:[c([53,57,62],1),r(.5),r(.5),n(57,.5),n(60,.5)],left:bass(38,50)},
  {right:[c([53,57,62],1),c([53,57,62],1),c([57,62],.5),c([57,65],.5)],left:bass(38,50)},
  {right:[c([62,65,69],1),c([62,65,69],1),c([62,67],.5),c([62,65],.5)],left:bass(34,46)},
  {right:[c([62,67,70],1),c([62,67,70],1),c([65,69],.5),c([64,67],.5)],left:bass(31,43)},
];

// Notehead centres measured in the four cropped systems. They correspond to
// the distinct onset times produced by combineHands(), in reading order.
export const pirateOnsetXs=[
  [366,457,542,633],
  [769,859,945,1007,1069],
  [1181,1272,1357,1448],
  [1584,1674,1760,1822,1884],
  [1996,2086,2172,2262],
  [306,411,516,594,673],
  [816,922,1025,1104,1182],
  [1350,1457,1559,1637,1716],
  [1884,1991,2093,2171,2249],
  [303,401,475,573,647,722],
  [882,986,1084,1158,1232],
  [1393,1496,1594,1668,1743],
  [1903,2006,2105,2179,2253],
  [305,411,512,589,667],
  [833,938,1040,1118,1195],
  [1361,1467,1568,1645,1723],
  [1889,1995,2096,2173,2251],
];

const pitches=event=>event.type==='chord'?event.midis:event.type==='note'?[event.midi]:[];

export function combineHands(measures){
  return measures.flatMap((measure,measureIndex)=>{
    const byOnset=new Map();
    for(const [hand,part] of [['right',measure.right],['left',measure.left]]){
      let onset=0;
      for(const event of part){
        const midis=pitches(event);
        if(midis.length){
          const item=byOnset.get(onset)||{measureIndex,onset,rightMidis:[],leftMidis:[]};
          item[`${hand}Midis`].push(...midis);
          byOnset.set(onset,item);
        }
        onset+=event.duration;
      }
      if(Math.abs(onset-3)>1e-9)throw new Error(`Takt ${measureIndex+1}: ${hand} hat ${onset} statt 3 Schläge`);
    }
    const onsets=[...byOnset.keys()].sort((a,b)=>a-b);
    if(pirateOnsetXs[measureIndex]?.length!==onsets.length)throw new Error(`Takt ${measureIndex+1}: Notenpositionen fehlen`);
    return onsets.map((onset,index)=>{
      const item=byOnset.get(onset);
      return {...item,x:pirateOnsetXs[measureIndex][index],type:'chord',midis:[...new Set([...item.rightMidis,...item.leftMidis])],duration:(onsets[index+1]??3)-onset};
    });
  });
}
