import type { CharacterAppearance } from '../../../shared/story/types';

export function PeriodCostume({ appearance: a, seated }: { appearance: CharacterAppearance; seated: boolean }) {
  const garment = a.garment ?? (a.dress ? 'day-dress' : 'lounge');
  const dress = garment === 'day-dress', police = garment === 'police-tunic';
  const hem = garment === 'frock' ? .57 : garment === 'work-jacket' ? .94 : .76;
  return <group>
    {dress ? <Dress appearance={a} seated={seated}/> : <>
      <mesh position={[0, (1.62 + hem) / 2, 0]} castShadow><cylinderGeometry args={[.28, .33, 1.62 - hem, 12]}/><meshStandardMaterial color={a.coat} roughness={1}/></mesh>
      {!police && <mesh position={[0, 1.38, .263]}><boxGeometry args={[.26, .47, .065]}/><meshStandardMaterial color={a.waistcoat} roughness={1}/></mesh>}
      {!police && [-1, 1].map(side => <mesh key={side} position={[side * .16, 1.48, .295]} rotation={[0, 0, side * -.36]}><boxGeometry args={[.105, .34, .045]}/><meshStandardMaterial color={a.coat} roughness={1}/></mesh>)}
    </>}
    <mesh position={[0, 1.66, .035]}><cylinderGeometry args={[.13, .17, .13, 12]}/><meshStandardMaterial color={dress || police ? a.coat : '#d2c9ae'} roughness={1}/></mesh>
    {!dress && !police && <mesh position={[0, 1.565, .307]} scale={[.055, .115, .027]}><sphereGeometry args={[1, 8, 6]}/><meshStandardMaterial color={a.neckwear ?? '#39302b'}/></mesh>}
    {(police ? [1.03, 1.17, 1.31, 1.45, 1.59] : [1.2, 1.32, 1.44]).map(y => <mesh key={y} position={[0, y, dress ? .278 : .308]}><sphereGeometry args={[police ? .023 : .016, 6, 5]}/><meshStandardMaterial color={police ? '#b7bbc0' : a.accent} metalness={police ? .65 : .1}/></mesh>)}
    {a.apron && <Apron color={a.apron} seated={seated}/>}
    {a.chain && <mesh position={[.12, 1.14, .335]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.12, .009, 5, 16, Math.PI]}/><meshStandardMaterial color="#c3a364" metalness={.6} roughness={.5}/></mesh>}
    {a.shawl && <Shawl color={a.shawl}/>}
  </group>;
}

function Dress({ appearance: a, seated }: { appearance: CharacterAppearance; seated: boolean }) {
  return <group>
    <mesh position={[0, 1.385, 0]} castShadow><cylinderGeometry args={[.285, .235, .47, 12]}/><meshStandardMaterial color={a.coat} roughness={1}/></mesh>
    <mesh position={[0, seated ? .98 : .65, seated ? .16 : 0]} castShadow><cylinderGeometry args={[.235, .49, seated ? .5 : 1.02, 20]}/><meshStandardMaterial color={a.coat} roughness={1}/></mesh>
    <mesh position={[0, .84, -.12]} scale={[1, 1, .7]}><cylinderGeometry args={[.22, .41, .64, 16]}/><meshStandardMaterial color={a.coat} roughness={1}/></mesh>
    <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[.243, .249, .055, 16]}/><meshStandardMaterial color={a.waistcoat} roughness={1}/></mesh>
  </group>;
}

function Apron({ color, seated }: { color: string; seated: boolean }) {
  return <group>
    <mesh position={[0, 1.005, seated ? .4 : .3]} rotation={[seated ? -.45 : -.25, 0, 0]}><cylinderGeometry args={[.22, .405, .79, 12, 1, true, -.77, 1.54]}/><meshStandardMaterial color={color} side={2} roughness={1}/></mesh>
    <mesh position={[0, 1.39, .29]}><boxGeometry args={[.22, .3, .025]}/><meshStandardMaterial color={color} roughness={1}/></mesh>
  </group>;
}

function Shawl({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 1.43, -.15]} scale={[.44, .27, .16]}><sphereGeometry args={[1, 12, 8]}/><meshStandardMaterial color={color} roughness={1}/></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * .25, 1.41, .14]} rotation={[0, 0, side * -.45]} scale={[.16, .3, .12]}><sphereGeometry args={[1, 10, 8]}/><meshStandardMaterial color={color} roughness={1}/></mesh>)}
  </group>;
}

export function PeriodHair({ appearance: a }: { appearance: CharacterAppearance }) {
  const style = a.hairStyle ?? (a.dress ? 'chignon' : 'short');
  if (style === 'short') return <mesh position={[0, .32, a.balding ? -.115 : -.055]} scale={a.balding ? [1, .7, .72] : [1, 1, 1]}><sphereGeometry args={[.243, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]}/><meshStandardMaterial color={a.hair} roughness={1}/></mesh>;
  return <group>
    {[-1, 1].map(side => <mesh key={side} position={[side * .125, .335, -.04]} rotation={[0, 0, side * -.24]} scale={[.145, .173, .227]} castShadow><sphereGeometry args={[1, 12, 10]}/><meshStandardMaterial color={a.hair} roughness={1}/></mesh>)}
    <mesh position={[0, .23, -.13]} scale={[.23, .245, .16]}><sphereGeometry args={[1, 12, 10]}/><meshStandardMaterial color={a.hair} roughness={1}/></mesh>
    {style === 'chignon' ? <mesh position={[0, .13, -.285]} scale={[.185, .13, .115]} castShadow><sphereGeometry args={[1, 14, 10]}/><meshStandardMaterial color={a.hair} roughness={1}/></mesh> : <group>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i / 12 * Math.PI * 2;
        return <mesh key={i} position={[Math.sin(angle) * .135, .19 + Math.cos(angle) * (style === 'pinned-plait' ? .23 : .14), -.285]} rotation={[0, 0, -angle]} scale={[.068, .087, .065]} castShadow><sphereGeometry args={[1, 8, 6]}/><meshStandardMaterial color={a.hair} roughness={1}/></mesh>;
      })}
    </group>}
    <mesh position={[.055, .22, -.358]} rotation={[0, 0, -.4]}><boxGeometry args={[.12, .012, .012]}/><meshStandardMaterial color="#544334"/></mesh>
  </group>;
}
