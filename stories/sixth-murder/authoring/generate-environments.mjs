import { mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const assets = new URL('../assets/models/', import.meta.url);
const palette = {
  wood: '#6a4932', woodLight: '#91704e', woodDark: '#35281f', plaster: '#777263',
  green: '#485648', brick: '#685047', stone: '#727269', iron: '#272c2a',
  brass: '#b0924e', linen: '#b9ad92', paper: '#d3c3a0', leather: '#49382b',
  glass: '#6b8790', black: '#292723', blue: '#4e616b', red: '#704c43',
};
const materialOptions = {
  iron: { metalness: .65, roughness: .6 }, brass: { metalness: .8, roughness: .38 },
  glass: { metalness: .25, roughness: .22 }, glow: { emissive: '#ffd189', emissiveIntensity: 2.5 },
};
const spatialContract = {
  window: { x: .8, z: -6.95 }, steps: { x: -1.6, z: -5.2 }, discovery: { x: 3.5, z: -.8 },
  screen: { minX: 1.3, maxX: 4.35, minZ: -5, maxZ: -2.5 },
  route: { width: 1.9, rise: .45, steps: 3, length: 3.4 },
};

async function generate() {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  };
  await mkdir(assets, { recursive: true });
  const builders = {
    'lantern-common': commonRoom, 'lantern-yard': yard, 'nora-room': noraRoom,
    'baines-room': bainesRoom, 'alden-workroom': mortuary, 'shaw-workshop': workshop,
    'vale-room': valeRoom, 'station-interview': station,
    'obj-trunk': trunk, 'obj-cart': cart, 'obj-room-floor': floorMarker,
    'obj-sewing-case': sewingCase,
    'obj-service-route': routeMarker, 'obj-hearth': hearthRemains, 'obj-work': workBundle, 'obj-candlestick': candlestick,
  };
  const models = {};
  const statistics = {};
  for (const [id, build] of Object.entries(builders)) {
    const set = new SetBuilder(id);
    build(set);
    const scene = set.finish();
    const data = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
    await writeFile(new URL(`${id}.glb`, assets), Buffer.from(data));
    models[id.startsWith('obj-') ? id : `set-${id}`] = `models/${id}.glb`;
    statistics[id] = { bytes: data.byteLength, meshes: scene.children.filter(child => child.isMesh).length };
  }
  const objects = Object.fromEntries(Object.entries({ trunk: 'obj-trunk', 'cart-candlestick': 'obj-cart', 'room-disturbance': 'obj-room-floor', 'sewing-case': 'obj-sewing-case', 'service-route': 'obj-service-route', 'hearth-remains': 'obj-hearth', 'unfinished-work': 'obj-work' }).map(([id, asset]) => [id, { model: 'gltf', asset }]));
  const fragment = { locations: locations(), objects, models, sites: sites(), spatialContract, statistics };
  await writeFile(new URL('scenes.json', import.meta.url), `${JSON.stringify(fragment, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(statistics, null, 2)}\n`);
}

function commonRoom(s) {
  room(s, { wall: 'green', floor: 'wood', back: -6.8, front: 7.4 });
  hearth(s, 0, -6.3, true);
  dresser(s, -3.9, -5.7, 1.4);
  shelves(s, 3.1, -6.53, 2.6, 3);
  window(s, -2.75, -6.58, 1.5, 1.5);
  table(s, -2.45, -1.9, 2.2, 1.15);
  bench(s, -2.45, -.65, 2.25);
  cloth(s, -2.8, .96, -1.9, 1.0, .6, 'blue');
  sewingThings(s, -2.65, .99, -1.9);
  mug(s, -1.75, .97, -2.12);
  chair(s, -3.6, -3.0, Math.PI / 2);
  table(s, 2.65, -3.3, 1.5, 1.1);
  mug(s, 2.95, .97, -3.4);
  bottle(s, 2.2, .98, -3.55, 'green');
  bench(s, 2.8, -4.35, 1.75);
  counter(s, 3.6, 1.4, 1.45, 2.5);
  lamp(s, 3.6, 1.15, 1.8, 28);
  hooks(s, -4.64, 1.1);
  rug(s, -.3, 3.8, 3.4, 2.5, 'red');
  door(s, -3.5, -6.63, .95, 'woodDark');
  s.box([-.95, 3.65, -4.75], [0.18, .22, 4.25], 'woodDark');
  s.box([1.35, 3.65, -4.75], [.18, .22, 4.25], 'woodDark');
  s.box([0, 3.65, -2.8], [9.4, .3, .22], 'woodDark');
  lamp(s, 1.4, 2.9, -2.8, 60, true);
  lantern(s, -4.0, 2.0, 5.6, 24);
  broom(s, -4.3, -4.45);
  foldedTowels(s, 3.9, 1.2, .45);
  s.box([-4.6, 1.1, -3.0], [.035, .6, .44], 'linen', .78);
}

function yard(s, { view = false } = {}) {
  cobbles(s, -5.0, 5.0, -7.2, 7.8);
  if (!view) wallBricks(s, 0, 2.0, -7.2, 10.4, 4.0);
  s.box([-5.06, 1.55, .1], [.18, 3.1, 14.3], 'brick');
  s.box([5.06, 1.2, .1], [.18, 2.4, 14.3], 'brick');
  exteriorMasonry(s, [-4.95, 0, .1], 14.3, 3.1, Math.PI / 2, 13);
  exteriorMasonry(s, [4.95, 0, .1], 14.3, 2.4, -Math.PI / 2, 31);
  if (!view) {
    trimCourses(s, -7.06, 10.2, 3.45);
    door(s, -1.6, -7.02, 1.55, 'green', .45);
    window(s, .8, -7.0, 1.7, 1.45, 1.65);
    window(s, -3.65, -7.0, 1.05, 1.2, 1.75);
  }
  s.box([-1.6, .225, -6.15], [1.9, .45, 1.75], 'stone');
  for (let i = 0; i < 3; i++) s.box([-1.6, .075 * (3 - i), -5.12 + i * .42], [1.9, .15 * (3 - i), .43], 'stone');
  rail(s, -2.61, -6.3, -4.32, 1.07);
  washhouse(s);
  drain(s, .35, 2.1);
  barrel(s, -4.05, -5.9, .47);
  barrel(s, 4.35, 3.8, .52);
  bucket(s, 3.4, -2.35);
  laundry(s, -3.9, 2.2, -6.75);
  lantern(s, -3, 2.45, -6.8, 42);
  lantern(s, 4.65, 2.2, .4, 25);
  s.light([0, 4.5, -2], '#a0b9c2', 18, 16);
  s.box([-.25, .023, 6.6], [8.7, .045, 1.1], 'stone', 1, [0, 0, 0]);
  if (!view) {
    s.box([-4.91, 1.5, 6.3], [.2, 3, 2.8], 'woodDark');
    for (let i = 0; i < 5; i++) s.box([-4.78, 1.1, 5.2 + i * .43], [.11, 2.2, .32], 'wood');
  }
}

function noraRoom(s) {
  room(s, { wall: 'plaster', back: -5.6, front: 6.3, width: 9.2 });
  window(s, 1.8, -5.42, 1.7, 1.7);
  bed(s, -2.8, -3.35, false);
  washstand(s, 3.0, -4.4);
  table(s, 2.9, -.6, 1.9, 1.05);
  chair(s, 3.3, 1.1, -.12);
  rug(s, -.45, -.75, 2.0, 2.8, 'red', -.16);
  cloth(s, -2.75, .18, -.65, 1.1, .8, 'blue');
  cloth(s, -3.55, .13, -.25, .7, .5, 'linen');
  s.box([-3.4, .12, .25], [.56, .24, .4], 'leather', .88, [0, .16, 0]);
  stool(s, -1.3, -4.6);
  s.cylinder([-1.3, .63, -4.6], .24, .015, 'woodDark', .85);
  hooks(s, -4.42, 2.45);
  lamp(s, 3.3, 1.05, -.65, 20);
  s.light([1.8, 2.3, -4.8], '#abc4cc', 24, 12);
  door(s, 0, -5.44, 1.3, 'woodDark');
  s.box([-1.55, 3.0, -4.0], [.2, .25, 3.15], 'woodDark');
  s.box([1.6, 3.0, -4.0], [.2, .25, 3.15], 'woodDark');
  s.box([3.0, 1.05, -.04], [.5, .28, .025], 'linen', .83);
}

function bainesRoom(s) {
  const outside = new SetBuilder('yard-through-window');
  yard(outside, { view: true });
  s.absorb(outside, new THREE.Matrix4().makeRotationY(Math.PI), [.8, 0, -6.95]);
  floorboards(s, -4.4, 4.4, .15, 7.0);
  s.box([-3.38, 1.65, .04], [2.24, 3.3, .22], 'green');
  s.box([3.65, 1.65, .04], [1.7, 3.3, .22], 'green');
  s.box([.3, .62, .04], [5.4, 1.24, .22], 'green');
  s.box([.3, 3.1, .04], [5.4, .4, .22], 'green');
  s.box([.3, 1.24, .2], [5.8, .12, .36], 'woodDark');
  for (const x of [-2.5, .3, 3.1]) s.box([x, 2.14, .1], [.1, 1.8, .12], 'woodLight');
  s.box([.3, 2.65, .1], [5.6, .08, .12], 'woodLight');
  s.box([-4.5, 1.35, 3.3], [.2, 2.7, 6.7], 'green');
  s.box([4.5, .45, 3.3], [.2, .9, 6.7], 'green');
  dresser(s, -3.6, 1.3, 1.3);
  table(s, 2.8, 2.9, 1.5, .95);
  lamp(s, 2.95, 1.03, 2.8, 26);
  mug(s, 2.35, .97, 2.75);
  chair(s, 3.2, 4.1, -.2);
  rug(s, -.5, 4.25, 2.6, 2.0, 'blue');
  s.box([-4.32, 1.15, 4.7], [.14, 2.3, 1.3], 'woodDark');
  s.box([-4.2, 1.23, 4.65], [.1, .08, .8], 'iron');
}

function mortuary(s) {
  room(s, { wall: 'plaster', floor: 'stone', back: -6.3, front: 6.8 });
  wallTiles(s, -6.12, 9.4, 1.15);
  door(s, 2.7, -6.07, 1.35, 'woodDark');
  s.box([2.7, 1.8, -5.98], [.6, .25, .025], 'brass', .65);
  window(s, -2.8, -6.1, 1.7, 1.25, 2.0);
  table(s, -2.6, -2.7, 2.5, 1.4);
  chair(s, -3.7, -4, .4);
  basin(s, -3.3, 1.0, -2.8, .32);
  bottle(s, -2.25, 1, -3, 'green');
  bottle(s, -1.8, 1, -3.1, 'glass');
  foldedTowels(s, -2.9, 1.0, -2.25);
  shelves(s, -.1, -6.05, 2.4, 3, 'woodDark');
  cabinet(s, 3.55, -2.3, 1.4);
  washstand(s, -3.6, 2.4);
  stool(s, 2.9, 1.1);
  lamp(s, -1.9, 1.05, -2.25, 35);
  s.light([-2.8, 3.0, -4.4], '#b3c7c5', 20, 13);
  lantern(s, 3.8, 2.8, -5.65, 18);
}

function workshop(s) {
  room(s, { wall: 'plaster', back: -6.5, front: 7.2 });
  for (const x of [-2.7, 0, 2.7]) window(s, x, -6.32, 1.9, 1.9, 1.65);
  table(s, -2.8, -2.7, 2.4, 1.45);
  sewingMachine(s, -2.95, 1.01, -3.0);
  chair(s, -2.9, -1.25, .05);
  table(s, 2.6, -3.1, 2.3, 1.45);
  cloth(s, 2.45, .98, -3.0, 1.4, .8, 'blue');
  sewingThings(s, 2.9, 1, -3.25);
  table(s, 2.8, 1.0, 1.9, 1.4);
  cloth(s, 2.75, .98, 1.0, 1.6, 1.0, 'linen');
  s.box([2.35, 1.02, 1.15], [.45, .025, .65], 'paper', .9, [0, .1, 0]);
  shelves(s, -3.6, -6.28, 1.55, 3);
  for (let i = 0; i < 6; i++) roll(s, -4.2 + i * .22, .14, 2.0, 1.35 + seeded(i) * .4, i % 2 ? 'blue' : 'linen');
  mannequin(s, 3.7, 4.65);
  basket(s, -3.2, 3.4);
  cloth(s, -3.2, .75, 3.4, .6, .7, 'red');
  lamp(s, -1.95, 1.08, -2.55, 30);
  lamp(s, 3.4, 1.08, .9, 28);
  s.light([0, 3.5, -5], '#bed1d0', 35, 16);
  s.box([-.7, 3.55, -4.7], [.18, .24, 3.6], 'woodDark');
  broom(s, -4.45, -4.8);
  for (let i = 0; i < 5; i++) s.box([3.3, .22 + i * .055, 1.45], [.55, .04, .32], 'blue', .7 + i * .04);
}

function valeRoom(s) {
  room(s, { wall: 'green', back: -5.8, front: 6.9 });
  hearth(s, 1.0, -5.3, false);
  bed(s, -3.0, -3.2, true);
  table(s, 3.05, -.7, 1.65, 1.05);
  bottle(s, 3.4, .98, -.95, 'green');
  mug(s, 2.5, .98, -.8);
  chair(s, 2.9, 1.0, -.3);
  washstand(s, -3.5, 1.25);
  window(s, 3.5, -5.6, 1.15, 1.4, 1.9);
  dresser(s, -3.6, -5.1, 1.3);
  hooks(s, 4.64, 2.6);
  rug(s, -.6, 1.2, 2.3, 2.1, 'blue', .06);
  bucket(s, 2.6, -3.9);
  lamp(s, 3.3, 1.0, -.55, 23);
  lantern(s, -.65, 2.2, -5.25, 28);
  s.light([3.5, 2.5, -4.2], '#95aeb6', 14, 12);
}

function station(s) {
  room(s, { wall: 'plaster', floor: 'wood', back: -6.5, front: 7.0 });
  panelling(s, -6.32, 9.4, 1.35);
  window(s, -2.8, -6.29, 1.8, 1.6, 1.9);
  door(s, 3.1, -6.28, 1.3, 'woodDark');
  table(s, 0, -.1, 2.4, 1.25, .84);
  chair(s, 0, -2.8, 0);
  chair(s, -.8, 1.1, 0);
  chair(s, .8, 1.1, 0);
  lamp(s, -.95, .9, -.35, 30);
  s.box([.65, .9, -.24], [.3, .045, .44], 'paper');
  s.cylinder([.97, .96, -.32], .07, .12, 'black');
  s.box([.98, 1.13, -.32], [.012, .24, .012], 'woodDark', 1, [0, 0, .3]);
  cabinet(s, -3.7, -3.6, 1.25);
  bench(s, 3.6, 2.6, 2.1, Math.PI / 2);
  hooks(s, 4.65, -2.1);
  clockFace(s, 0, 2.65, -6.24);
  lantern(s, 2.0, 2.65, -5.85, 25);
  s.light([-2.8, 2.9, -4.7], '#b2c5ce', 28, 15);
}

class SetBuilder {
  constructor(name) { this.name = name; this.parts = new Map(); this.lights = []; }
  finish() {
    const scene = new THREE.Group(); scene.name = this.name;
    for (const [kind, geometries] of this.parts) {
      const geometry = mergeGeometries(geometries);
      const material = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .92, ...materialOptions[kind] });
      material.name = `${this.name}-${kind}`;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${this.name}-${kind}`; mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
    }
    for (const light of this.lights) scene.add(light);
    return scene;
  }
  box(position, size, kind = 'wood', shade = 1, rotation = [0, 0, 0]) {
    this.add(new THREE.BoxGeometry(...size), position, kind, shade, rotation);
  }
  cylinder(position, radius, height, kind = 'iron', shade = 1, top = radius, rotation = [0, 0, 0]) {
    this.add(new THREE.CylinderGeometry(top, radius, height, 14), position, kind, shade, rotation);
  }
  sphere(position, scale, kind, shade = 1) {
    const geometry = new THREE.SphereGeometry(1, 12, 8); geometry.scale(...scale);
    this.add(geometry, position, kind, shade);
  }
  torus(position, radius, thickness, kind = 'iron', rotation = [0, 0, 0]) {
    this.add(new THREE.TorusGeometry(radius, thickness, 6, 20), position, kind, 1, rotation);
  }
  add(geometry, position, kind, shade = 1, rotation = [0, 0, 0]) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix);
    const color = new THREE.Color(palette[kind] ?? (kind === 'glow' ? '#ffd79e' : kind)).multiplyScalar(shade);
    const values = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) { values[i] = color.r; values[i + 1] = color.g; values[i + 2] = color.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
    if (!this.parts.has(kind)) this.parts.set(kind, []);
    this.parts.get(kind).push(geometry);
  }
  light(position, color, intensity, distance = 13) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(...position); this.lights.push(light);
  }
  absorb(other, rotation, translation) {
    const matrix = new THREE.Matrix4().makeTranslation(...translation).multiply(rotation);
    for (const [kind, geometries] of other.parts) {
      if (!this.parts.has(kind)) this.parts.set(kind, []);
      for (const geometry of geometries) this.parts.get(kind).push(geometry.applyMatrix4(matrix));
    }
    for (const light of other.lights) { light.applyMatrix4(matrix); this.lights.push(light); }
  }
}

function room(s, { wall = 'plaster', floor = 'wood', back = -6.5, front = 7.0, width = 9.5 } = {}) {
  if (floor === 'wood') floorboards(s, -width / 2, width / 2, back, front);
  else flagstones(s, -width / 2, width / 2, back, front);
  s.box([0, 1.8, back - .1], [width + .3, 3.6, .2], wall);
  s.box([-width / 2 - .1, 1.8, back + 2.1], [.2, 3.6, 4.4], wall, .88);
  s.box([width / 2 + .1, 1.8, back + 2.1], [.2, 3.6, 4.4], wall, 1.05);
  s.box([-width / 2 - .1, .32, (back + 4.3 + front) / 2], [.2, .64, front - back - 4.3], wall, .88);
  s.box([width / 2 + .1, .32, (back + 4.3 + front) / 2], [.2, .64, front - back - 4.3], wall, 1.05);
  s.box([0, .12, back + .04], [width, .24, .12], 'woodDark');
  s.box([0, 3.42, back + .05], [width, .1, .13], 'woodLight', .8);
  for (let i = 0; i < 18; i++) {
    const x = -width / 2 + seeded(i) * width;
    const y = .5 + seeded(i + 6) * 2.4;
    s.box([x, y, back + .007], [.17 + seeded(i + 3) * .45, .02 + seeded(i + 4) * .08, .02], wall, .82);
  }
}

function floorboards(s, minX, maxX, minZ, maxZ) {
  s.box([(minX + maxX) / 2, -.10, (minZ + maxZ) / 2], [maxX - minX, .15, maxZ - minZ], 'woodDark');
  let index = 0;
  for (let x = minX; x < maxX; x += .39) for (let z = minZ; z < maxZ; z += 1.55) {
    const width = Math.min(.375, maxX - x), depth = Math.min(1.53, maxZ - z);
    s.box([x + width / 2, -.022, z + depth / 2], [width, .035, depth], 'wood', .83 + seeded(index++) * .37);
    for (const end of [-1, 1]) s.cylinder([x + width / 2, -.002, z + depth / 2 + end * (depth / 2 - .07)], .011, .004, 'iron');
    if (index % 3 === 0) s.box([x + width * .64, 0, z + depth / 2], [.008, .003, depth * .8], 'woodDark', .9);
  }
}

function flagstones(s, minX, maxX, minZ, maxZ) {
  s.box([(minX + maxX) / 2, -.08, (minZ + maxZ) / 2], [maxX - minX, .1, maxZ - minZ], 'iron');
  let index = 0;
  for (let x = minX; x < maxX; x += .72) for (let z = minZ; z < maxZ; z += .8) {
    const w = Math.min(.7, maxX - x), d = Math.min(.78, maxZ - z);
    s.box([x + w / 2, -.026, z + d / 2], [w, .05, d], 'stone', .84 + seeded(index++) * .25);
  }
}

function cobbles(s, minX, maxX, minZ, maxZ) {
  s.box([(minX + maxX) / 2, -.08, (minZ + maxZ) / 2], [maxX - minX, .1, maxZ - minZ], 'iron');
  let row = 0, index = 0;
  for (let z = minZ; z < maxZ; z += .32, row++) for (let x = minX + (row % 2) * .21; x < maxX; x += .46) {
    const width = Math.min(.425, maxX - x);
    s.box([x + width / 2, -.032 + seeded(index) * .02, z + .145], [width, .08, .28], 'stone', .7 + seeded(index++) * .35, [0, (seeded(index) - .5) * .035, 0]);
  }
}

function wallBricks(s, x, y, z, width, height) {
  s.box([x, y, z], [width, height, .3], 'plaster', .66);
  for (let row = 0; row < height / .19; row++) for (let column = 0; column < width / .46; column++) {
    const bx = x - width / 2 + column * .46 + (row % 2) * .23;
    s.box([bx, row * .19 + .08, z + .17], [.43, .165, .05], 'brick', .75 + seeded(row * 55 + column) * .35);
  }
}

function exteriorMasonry(s, origin, width, height, rotation, seed) {
  const across = new THREE.Vector3(Math.cos(rotation), 0, -Math.sin(rotation));
  const normal = new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation));
  const position = (x, y, depth = 0) => new THREE.Vector3(...origin).addScaledVector(across, x).addScaledVector(normal, depth).add(new THREE.Vector3(0, y, 0)).toArray();
  s.add(new THREE.PlaneGeometry(width, height), position(0, height / 2, -.005), 'stone', .54, [0, rotation, 0]);
  for (let row = 0; row * .145 < height; row++) {
    const y = row * .145, brickHeight = Math.min(.132, height - y);
    for (let edge = -width / 2 - (row % 2) * .175, column = 0; edge < width / 2; edge += .35, column++) {
      const left = Math.max(edge, -width / 2), right = Math.min(edge + .339, width / 2);
      if (right <= left) continue;
      const random = seeded(seed + row * 113 + column);
      const damp = .63 + .37 * Math.min(1, y / (.4 + seeded(column + seed) * .45));
      const soot = 1 - .11 * Math.max(0, (y / height - .75) * 4);
      const kind = row < 3 && random < .13 ? 'green' : 'brick';
      s.add(new THREE.PlaneGeometry(right - left, brickHeight), position((left + right) / 2, y + brickHeight / 2), kind, (.83 + random * .27) * damp * soot, [0, rotation, 0]);
    }
  }
}

function trimCourses(s, z, width, y) {
  s.box([0, y, z], [width, .13, .12], 'stone');
  s.box([0, y + .2, z], [width, .08, .18], 'stone', .78);
}

function window(s, x, z, width = 1.5, height = 1.6, y = 2.0) {
  s.box([x, y, z], [width, height, .075], 'woodDark');
  s.box([x, y, z + .047], [width - .15, height - .15, .025], 'glass');
  for (const dx of [-width / 2, 0, width / 2]) s.box([x + dx, y, z + .09], [.07, height + .1, .1], 'woodLight', .83);
  for (const dy of [-height / 2, 0, height / 2]) s.box([x, y + dy, z + .095], [width + .15, .075, .12], 'woodLight', .85);
  s.box([x, y - height / 2 - .08, z + .17], [width + .3, .13, .38], 'stone');
  s.light([x, y, z + .45], '#a5b6b9', 8, 7);
}

function door(s, x, z, width = 1.2, kind = 'woodDark', base = 0) {
  s.box([x, base + 1.25, z], [width + .2, 2.5, .12], 'woodDark');
  s.box([x, base + 1.2, z + .075], [width, 2.4, .10], kind);
  for (const y of [.58, 1.64]) for (const dx of [-.23, .23]) s.box([x + dx * width, base + y, z + .135], [width * .36, .82, .035], kind, .82);
  for (const dx of [-1, 1]) s.box([x + dx * (width / 2 + .08), base + 1.26, z + .09], [.12, 2.6, .15], 'woodLight', .72);
  s.box([x, base + 2.53, z + .1], [width + .32, .14, .18], 'woodLight', .78);
  s.sphere([x + width * .36, base + 1.15, z + .24], [.055, .055, .055], 'brass');
}

function table(s, x, z, width = 2, depth = 1.2, y = .93) {
  for (let i = 0; i < 4; i++) s.box([x - width / 2 + width * (i + .5) / 4, y, z], [width / 4 - .013, .11, depth], 'woodLight', .79 + seeded(i) * .2);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) s.box([x + dx * (width / 2 - .16), y / 2, z + dz * (depth / 2 - .12)], [.11, y, .11], 'woodDark');
  s.box([x, .28, z], [width - .16, .1, .1], 'woodDark');
  s.box([x, y - .19, z], [width - .15, .2, depth - .15], 'wood', .8);
}

function chair(s, x, z, rotation = 0) {
  const t = new SetBuilder('chair');
  t.box([0, .49, 0], [.52, .09, .52], 'wood');
  for (const dx of [-.2, .2]) for (const dz of [-.2, .2]) t.box([dx, .245, dz], [.065, .49, .065], 'woodDark');
  for (const dx of [-.22, .22]) t.box([dx, .85, -.22], [.065, .74, .065], 'wood');
  for (const y of [.82, 1.06]) t.box([0, y, -.22], [.5, .09, .045], 'woodLight', .78);
  s.absorb(t, new THREE.Matrix4().makeRotationY(rotation), [x, 0, z]);
}

function stool(s, x, z) {
  s.cylinder([x, .51, z], .27, .09, 'wood');
  for (const angle of [0, 2.1, 4.2]) s.box([x + Math.cos(angle) * .18, .25, z + Math.sin(angle) * .18], [.07, .5, .07], 'woodDark');
}

function bench(s, x, z, width = 2, rotation = 0) {
  const t = new SetBuilder('bench');
  t.box([0, .5, 0], [width, .12, .4], 'wood');
  for (const side of [-1, 1]) t.box([side * (width / 2 - .16), .24, 0], [.16, .48, .35], 'woodDark');
  s.absorb(t, new THREE.Matrix4().makeRotationY(rotation), [x, 0, z]);
}

function counter(s, x, z, width, depth) {
  s.box([x, .55, z], [width, 1.1, depth], 'woodDark');
  s.box([x, 1.12, z], [width + .14, .12, depth + .14], 'wood');
  for (let i = 0; i < 7; i++) s.box([x - width / 2 - .013, .55, z - depth / 2 + depth * (i + .5) / 7], [.035, .97, depth / 7 - .03], 'wood', .9);
}

function dresser(s, x, z, width = 1.5) {
  s.box([x, .66, z], [width, 1.3, .6], 'woodDark');
  s.box([x, 1.35, z], [width + .12, .1, .68], 'wood');
  for (const y of [.28, .68, 1.08]) {
    s.box([x, y, z + .32], [width - .1, .33, .05], 'wood');
    for (const side of [-1, 1]) s.sphere([x + side * width * .27, y, z + .385], [.045, .035, .045], 'brass');
  }
}

function cabinet(s, x, z, width = 1.5) {
  s.box([x, 1.2, z], [width, 2.4, .65], 'woodDark');
  for (const dx of [-.25, .25]) {
    s.box([x + dx * width, 1.25, z + .36], [width * .46, 2.13, .09], 'wood');
    s.box([x + dx * width, 1.35, z + .412], [width * .34, 1.72, .025], 'woodDark');
    s.sphere([x + dx * .28, 1.12, z + .49], [.035, .045, .045], 'brass');
  }
  s.box([x, 2.42, z], [width + .16, .14, .8], 'wood');
}

function shelves(s, x, z, width, count, kind = 'wood') {
  for (let row = 0; row < count; row++) {
    const y = 1.35 + row * .48;
    s.box([x, y, z], [width, .09, .44], kind);
    for (let i = 0; i < 5; i++) {
      const px = x - width * .4 + width * .18 * i;
      if (i % 2) bottle(s, px, y + .07, z, i % 3 ? 'green' : 'glass', .8);
      else s.cylinder([px, y + .22, z], .11, .35, i % 3 ? 'linen' : 'woodLight');
    }
  }
}

function hearth(s, x, z, lit) {
  s.box([x, .06, z + .4], [2.5, .12, 1.6], 'stone', .72);
  s.box([x, .8, z + .1], [1.8, 1.5, .15], 'black', .52);
  for (const side of [-1, 1]) s.box([x + side * 1.0, .85, z + .2], [.3, 1.7, .75], 'brick');
  s.box([x, 1.7, z + .2], [2.5, .17, .93], 'woodDark');
  s.box([x, 2.5, z -.1], [2.2, 1.5, .4], 'plaster', .7);
  for (let i = 0; i < 6; i++) s.box([x - .65 + i * .25, .34, z + .48], [.07, .55, .08], 'iron', .8);
  s.box([x, .55, z + .48], [1.55, .06, .08], 'iron');
  if (lit) {
    for (let i = 0; i < 8; i++) s.sphere([x - .6 + seeded(i) * 1.2, .2, z + .2 + seeded(i + 20) * .5], [.17, .08, .13], i % 3 ? 'black' : 'glow', .7);
    for (const dx of [-.3, .1, .4]) s.sphere([x + dx, .38, z + .27], [.11, .25, .07], 'glow');
    s.light([x, .7, z + .95], '#ffa75b', 54, 11);
    kettle(s, x + .55, .65, z + .2);
  }
}

function lamp(s, x, y, z, intensity = 25, hanging = false) {
  s.cylinder([x, y, z], .16, .09, 'brass');
  s.cylinder([x, y + .16, z], .09, .24, 'brass');
  s.sphere([x, y + .29, z], [.2, .14, .2], 'glass');
  s.cylinder([x, y + .49, z], .07, .35, 'glass', 1.1, .085);
  s.sphere([x, y + .48, z], [.035, .105, .035], 'glow');
  s.light([x, y + .63, z], '#ffcf86', intensity, 10);
  if (hanging) {
    s.cylinder([x, y + .73, z], .33, .22, 'green', .8, .12);
    s.cylinder([x, y + .96, z], .016, .3, 'iron');
  }
}

function lantern(s, x, y, z, intensity = 25) {
  s.box([x, y, z], [.34, .52, .29], 'glass');
  s.box([x, y + .31, z], [.42, .1, .36], 'iron');
  s.box([x, y -.29, z], [.42, .08, .36], 'iron');
  for (const dx of [-.18, .18]) for (const dz of [-.15, .15]) s.box([x + dx, y, z + dz], [.03, .57, .03], 'iron');
  s.sphere([x, y -.03, z], [.06, .17, .06], 'glow');
  s.light([x, y, z + .24], '#ffcb83', intensity, 10);
}

function mug(s, x, y, z) {
  s.cylinder([x, y + .09, z], .085, .18, 'linen', .94);
  s.cylinder([x, y + .185, z], .066, .008, 'woodDark');
  s.torus([x + .096, y + .095, z], .057, .017, 'linen', [Math.PI / 2, 0, 0]);
}

function bottle(s, x, y, z, color = 'green', scale = 1) {
  s.cylinder([x, y + .16 * scale, z], .08 * scale, .32 * scale, color, .73);
  s.cylinder([x, y + .38 * scale, z], .038 * scale, .16 * scale, color, .85);
  s.cylinder([x, y + .47 * scale, z], .042 * scale, .025 * scale, 'woodLight');
}

function kettle(s, x, y, z) {
  s.sphere([x, y, z], [.22, .19, .22], 'iron');
  s.torus([x, y + .17, z], .19, .018, 'iron');
  s.cylinder([x -.25, y + .08, z], .044, .22, 'iron', 1, .036, [0, 0, -.9]);
  s.cylinder([x, y + .2, z], .11, .035, 'iron');
}

function washstand(s, x, z) {
  table(s, x, z, 1.05, .75, .94);
  s.box([x, 1.05, z -.31], [1.07, .25, .055], 'wood');
  basin(s, x -.15, 1.04, z, .29);
  s.cylinder([x + .28, 1.22, z -.08], .105, .36, 'linen', 1, .07);
  s.torus([x + .4, 1.26, z -.08], .105, .024, 'linen');
  foldedTowels(s, x -.03, .31, z + .03);
}

function basin(s, x, y, z, radius) {
  s.cylinder([x, y + .06, z], radius * .78, .12, 'linen', .95, radius);
  s.cylinder([x, y + .125, z], radius * .88, .01, 'glass', .55);
  s.torus([x, y + .13, z], radius, .025, 'linen', [Math.PI / 2, 0, 0]);
}

function bed(s, x, z, blanket) {
  for (const dx of [-.68, .68]) for (const dz of [-1.12, 1.12]) s.cylinder([x + dx, .55, z + dz], .042, 1.1, 'iron');
  s.box([x, .35, z], [1.4, .12, 2.2], 'woodDark');
  s.box([x, .51, z], [1.35, .22, 2.15], 'linen', .82);
  for (const dz of [-1.12, 1.12]) {
    s.cylinder([x, .93, z + dz], .035, 1.4, 'iron', 1, .035, [0, 0, Math.PI / 2]);
    for (const dx of [-.4, 0, .4]) s.cylinder([x + dx, .67, z + dz], .021, .5, 'iron');
  }
  s.sphere([x, .67, z -.72], [.52, .1, .27], 'linen');
  if (blanket) cloth(s, x, .65, z + .3, 1.35, 1.45, 'blue');
  else for (let i = 0; i < 4; i++) s.box([x -.5 + i * .3, .63, z + .2], [.008, .006, 1.4], 'woodLight', .65);
}

function rug(s, x, z, width, depth, color, angle = 0) {
  s.box([x, .02, z], [width, .028, depth], color, .77, [0, angle, 0]);
  for (let i = 0; i < 9; i++) s.box([x - width * .43 + width * .106 * i, .04, z], [.03, .006, depth * .91], 'linen', .65, [0, angle, 0]);
  for (const side of [-1, 1]) s.box([x, .041, z + side * depth * .43], [width * .92, .006, .055], 'linen', .77);
}

function cloth(s, x, y, z, width, depth, color) {
  s.box([x, y, z], [width, .035, depth], color);
  for (let i = 0; i < 7; i++) s.box([x - width * .42 + width * .14 * i, y + .023, z], [.025, .018, depth * .98], color, .82 + i % 3 * .07);
}

function foldedTowels(s, x, y, z) {
  for (let i = 0; i < 3; i++) cloth(s, x + i * .025, y + i * .047, z, .45, .3, 'linen');
}

function sewingThings(s, x, y, z) {
  for (let i = 0; i < 3; i++) {
    const px = x + .18 * i;
    s.cylinder([px, y + .08, z], .045, .16, i === 1 ? 'blue' : 'linen');
    for (const dy of [.01, .16]) s.cylinder([px, y + dy, z], .059, .018, 'woodLight');
  }
  for (const dx of [-.06, .06]) s.torus([x + dx + .4, y + .015, z + .27], .043, .009, 'iron', [Math.PI / 2, 0, 0]);
  s.box([x + .4, y + .015, z + .38], [.025, .015, .17], 'iron', 1, [0, .2, 0]);
}

function hooks(s, x, z) {
  s.box([x, 2.08, z], [.09, .13, 1.45], 'wood');
  for (const offset of [-.45, 0, .45]) s.torus([x + (x > 0 ? -.08 : .08), 2.01, z + offset], .055, .014, 'iron', [0, Math.PI / 2, 0]);
  s.box([x + (x > 0 ? -.11 : .11), 1.42, z -.45], [.07, 1.15, .44], 'blue', .7);
}

function washhouse(s) {
  const { screen } = spatialContract;
  const x = (screen.minX + screen.maxX) / 2, z = (screen.minZ + screen.maxZ) / 2;
  const width = screen.maxX - screen.minX, depth = screen.maxZ - screen.minZ;
  s.box([x, 1.25, z], [width - .016, 2.5, depth - .016], 'brick', .78);
  exteriorMasonry(s, [x, 0, screen.minZ], width, 2.5, Math.PI, 17);
  exteriorMasonry(s, [x, 0, screen.maxZ], width, 2.5, 0, 23);
  exteriorMasonry(s, [screen.minX, 0, z], depth, 2.5, -Math.PI / 2, 41);
  exteriorMasonry(s, [screen.maxX, 0, z], depth, 2.5, Math.PI / 2, 53);
  for (let i = 0; i < 11; i++) s.box([x, 2.54 + i * .006, z - 1.22 + i * .245], [3.3, .06, .225], 'stone', .54 + seeded(i) * .17);
  door(s, x, screen.maxZ + .05, .9, 'woodDark');
  s.cylinder([x + .8, 2.98, z -.6], .15, .9, 'iron');
  s.box([screen.minX -.1, 1.26, z], [.08, 2.5, .08], 'iron');
}

function rail(s, x, start, end, y) {
  for (const z of [start, end]) s.box([x, y / 2, z], [.075, y, .075], 'woodDark');
  s.box([x, y, (start + end) / 2], [.09, .08, Math.abs(end - start) + .1], 'woodDark');
}

function barrel(s, x, z, radius) {
  s.cylinder([x, .59, z], radius, 1.18, 'wood', .85, radius * .86);
  for (const y of [.16, .58, 1.01]) s.torus([x, y, z], radius * (1 - .12 * y), .035, 'iron', [Math.PI / 2, 0, 0]);
  s.cylinder([x, 1.2, z], radius * .86, .03, 'woodDark');
}

function bucket(s, x, z) {
  s.cylinder([x, .24, z], .2, .48, 'iron', 1, .25);
  s.cylinder([x, .488, z], .22, .012, 'black', .6);
  s.torus([x, .49, z], .23, .025, 'iron');
}

function basket(s, x, z) {
  s.cylinder([x, .35, z], .4, .68, 'woodLight', .85, .5);
  for (let i = 0; i < 9; i++) s.torus([x, .07 + i * .075, z], .4 + i * .012, .018, 'wood', [Math.PI / 2, 0, 0]);
}

function drain(s, x, z) {
  s.box([x, .015, z], [.75, .04, .7], 'black');
  for (let i = 0; i < 7; i++) s.box([x -.31 + i * .105, .04, z], [.034, .025, .64], 'iron');
}

function laundry(s, start, end, z) {
  s.box([(start + end) / 2, 3.1, z], [end - start, .016, .018], 'woodLight');
  for (let i = 0; i < 3; i++) s.box([start + 1 + i * 1.0, 2.72, z + .01], [.66, .75, .035], i === 1 ? 'blue' : 'linen', .8);
}

function wallTiles(s, z, width, height) {
  for (let row = 0; row < height / .24; row++) for (let col = 0; col < width / .48; col++) s.box([-width / 2 + col * .48 + .23, row * .24 + .13, z], [.465, .225, .05], 'linen', .8 + seeded(row + col) * .12);
}

function panelling(s, z, width, height) {
  s.box([0, height / 2, z], [width, height, .06], 'woodDark');
  for (let x = -width / 2 + .4; x < width / 2; x += .8) s.box([x, height / 2, z + .045], [.69, height - .24, .03], 'wood');
  s.box([0, height + .06, z + .06], [width, .12, .11], 'woodLight', .7);
}

function roll(s, x, y, z, length, color) {
  s.cylinder([x, y + length / 2, z], .13, length, color, .85);
  s.cylinder([x, y + length + .006, z], .036, .012, 'woodDark');
}

function sewingMachine(s, x, y, z) {
  s.box([x, y, z], [.85, .045, .4], 'iron');
  s.box([x + .24, y + .25, z], [.16, .5, .17], 'iron');
  s.box([x -.05, y + .47, z], [.72, .14, .18], 'iron');
  s.box([x -.36, y + .33, z], [.14, .23, .17], 'iron');
  s.box([x -.36, y + .15, z], [.015, .21, .015], 'brass');
  s.torus([x + .36, y + .42, z], .21, .027, 'iron', [0, Math.PI / 2, 0]);
  s.box([x, .22, z], [.45, .05, .26], 'iron');
  s.torus([x + .46, .43, z], .31, .018, 'iron', [0, Math.PI / 2, 0]);
}

function mannequin(s, x, z) {
  s.cylinder([x, .48, z], .04, .96, 'woodDark');
  s.box([x, .06, z], [.65, .09, .11], 'woodDark');
  s.box([x, .06, z], [.11, .09, .65], 'woodDark');
  s.sphere([x, 1.24, z], [.32, .48, .2], 'linen', .8);
  s.cylinder([x, 1.7, z], .075, .15, 'woodLight');
  s.box([x, 1.05, z + .18], [.5, .03, .02], 'blue');
}

function clockFace(s, x, y, z) {
  s.cylinder([x, y, z], .35, .12, 'woodDark', 1, .35, [Math.PI / 2, 0, 0]);
  s.cylinder([x, y, z + .075], .29, .025, 'linen', .9, .29, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    s.box([x + Math.sin(angle) * .24, y + Math.cos(angle) * .24, z + .093], [.018, .04, .009], 'iron', 1, [0, 0, -angle]);
  }
  s.box([x + .03, y + .07, z + .11], [.015, .17, .01], 'iron', 1, [0, 0, -.4]);
  s.box([x -.08, y, z + .11], [.17, .015, .01], 'iron');
}

function seeded(seed) { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); }

function locations() {
  const make = (id, siteId, indoor, bounds, obstacles, characters, clues = {}) => [id, {
    scene: 'model', sceneAsset: `set-${id}`, siteId, indoor,
    navigation: { bounds, obstacles, spawns: [{ x: -.75, z: bounds.maxZ - 1 }, { x: .75, z: bounds.maxZ - 1 }], characters, clues },
  }];
  const bounds = (minZ = -5.8, maxZ = 6.5, width = 4.15) => ({ minX: -width, maxX: width, minZ, maxZ });
  const rect = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });
  const locations = Object.fromEntries([
    make('lantern-common', 'lantern-inn', true, bounds(-5.7, 6.6), [rect(-3.85, -1.1, -2.7, -.25), rect(1.55, 3.65, -4.8, -2.55), rect(2.7, 4.2, -.1, 2.9), rect(-1.45, 1.45, -6, -5.1)], {"baines-arrival":[-2.6,0,1.6],"nora":[0,0,-1.8],"george-arrival":[2,0,4],"hale":[-2.6,0,1.6],"arthur-inn":[0,0,-1.8],"maggie-closing":[-2.6,0,1.6]}, { 'inn-newspaper': [2.55, 1.02, -3.3], 'opening-sewing': [-2.35, 1.0, -1.8], 'opening-trunk': [-3.15, .4, 4.6], 'opening-candlestick': [3.4, 1.18, 1.4] }),
    make('lantern-yard', 'lantern-inn', false, bounds(-5.7, 6.6), [rect(1.1, 4.4, -5.2, -2.3), rect(-2.8, -.45, -6.3, -4.3), rect(-4.2, -1.65, .2, 3.6)], {"george":[-0.3,0,-1.8]}, { 'opening-cart': [-2.8, .7, 1.8], 'trunk-interior': [-.1, .42, -4.65], 'cart-candlestick': [-2.8, .7, 1.8], 'yard-discovery': [3.45, .055, -.75] }),
    make('nora-room', 'lantern-inn', true, bounds(-4.9, 5.6, 4), [rect(-3.75, -1.85, -4.75, -1.95), rect(2.25, 3.8, -4.9, -3.65), rect(1.7, 4.0, -1.4, .3)], {}, { 'room-disturbance': [-.5, .047, -.8], 'room-fragment': [3, .025, -4.35], 'torn-wedding': [2.8, 1.0, -.55], 'travel-papers': [-2.75, .67, -2.8], 'workshop-lead': [3.5, 1.01, -.85] }),
    make('baines-room', 'lantern-inn', true, bounds(.65, 6.2, 4), [rect(-4.1, -2.8, .65, 1.85), rect(1.8, 3.8, 2.1, 3.6)], {"baines":[-1.5,0,2.2]}, { 'service-route': [2.1, 1.3, .25], 'window-view': [-.4, 1.3, .25] }),
    make('alden-workroom', 'alden-mortuary', true, bounds(-5.6, 6.0), [rect(-4.0, -1.1, -3.65, -1.75), rect(2.6, 4.3, -3.0, -1.5), rect(-4.15, -2.8, 1.7, 3.1)], {"alden":[0.1,0,-2.9]}, {}),
    make('shaw-workshop', 'shaw-workshop', true, bounds(-5.5, 6.4), [rect(-4.15, -1.35, -3.7, -.6), rect(1.2, 4.05, -4.05, -2.15), rect(1.6, 4, .05, 1.95), rect(-4.3, -2.55, 1.6, 4.1)], {"maggie":[0,0,-2.6]}, { 'unfinished-work': [2.6, 1.02, 1.0] }),
    make('vale-room', 'vale-lodgings', true, bounds(-4.9, 6), [rect(-3.95, -2.05, -4.6, -1.8), rect(1.95, 4.15, -1.5, .1), rect(-4.15, -2.8, .5, 2), rect(-.45, 2.5, -5.7, -4.2)], {}, { 'hearth-knife': [1.0, .21, -4.9] }),
    make('station-interview', 'commercial-street-station', true, bounds(-5.5, 6.2), [rect(-1.45, 1.45, -.9, 1.7), rect(-4.4, -2.9, -4.2, -2.9), rect(3.15, 4.1, 1.4, 3.8)], {"arthur-station":[0,0,-2.8],"hale-station":[2.7,0,-4.7]}, {}),
  ]);
  locations['lantern-common'].props = [{ id: 'inn-newspaper', model: 'image', asset: 'inn-newspaper-original', position: [2.55, 1.045, -3.3], rotation: [-Math.PI / 2, 0, 0], scale: [.68, .68, .68] }];
  return locations;
}

function sites() {
  const fictional = (id, name, address, note) => [id, { id, name, address, note, kind: 'fictional', precision: 'fictional', point: null, sources: [], placement: 'Invented story location in Whitechapel; no historical map pin or claimed surveyed interior.', reviewed: '2026-09-12' }];
  return Object.fromEntries([
    fictional('lantern-inn', 'The Lantern', 'A fictional inn in Whitechapel', 'All Lantern rooms share one site. The rear room opens onto a short broad service landing and three shallow steps. A projecting washhouse screens the discovery corner from Baines’s window.'),
    fictional('alden-mortuary', 'Alden’s mortuary workroom', 'A fictional mortuary workroom in Whitechapel', 'Period interpretation. Nora remains in the adjoining examination room beyond a closed door.'),
    fictional('shaw-workshop', 'Maggie Shaw’s workshop', 'A fictional garment workshop in Whitechapel', 'Small garment workshop, not a reconstruction of any historical business.'),
    fictional('vale-lodgings', 'Arthur Vale’s lodgings', 'The upstairs room above Bell’s boot-repair shop, off Commercial Road', 'The invented shop and room are supplied by Maggie and occupancy checked by Hale; all architecture is authored fiction.'),
    ['commercial-street-station', { id: 'commercial-street-station', name: 'Commercial Street police station', kind: 'historical', address: 'Former Police Station, Commercial Street E1', precision: 'site', point: null, note: 'Historic England records the 1874–75 station. The interview room is an artistic interpretation; the listing does not establish its interior plan.', sources: [{ title: 'Historic England, Former Police Station, list entry 1065207', url: 'https://historicengland.org.uk/listing/the-list/list-entry/1065207' }], placement: 'Historical site registered without a map pin. No surveyed interview-room location claimed.', reviewed: '2026-09-12' }],
  ]);
}

function trunk(s) {
  s.box([0, 0, 0], [1.75, .8, .92], 'leather');
  s.box([0, .4, 0], [1.78, .08, .95], 'woodDark');
  for (const x of [-.64, .64]) {
    s.box([x, 0, .47], [.12, .84, .025], 'woodLight', .7);
    s.box([x, .452, 0], [.12, .028, .95], 'woodLight', .7);
    s.box([x, .11, .492], [.14, .15, .025], 'brass', .8);
  }
  s.box([0, -.01, .51], [.14, .21, .035], 'brass');
  for (const x of [-.895, .895]) s.torus([x, .09, 0], .12, .022, 'iron', [0, Math.PI / 2, 0]);
}

function cart(s) {
  const cartWidth = 1.75, cartLength = 2.45;
  s.box([0, .03, 0], [cartWidth, .16, cartLength], 'woodDark');
  for (let i = 0; i < 6; i++) s.box([-.74 + i * .29, .13, 0], [.27, .07, cartLength], 'wood', .86 + i % 3 * .06);
  for (const x of [-.89, .89]) for (const y of [.26, .51]) s.box([x, y, 0], [.055, .2, cartLength], 'wood');
  s.box([0, .37, -1.23], [1.8, .46, .055], 'wood');
  s.cylinder([0, -.18, .15], .075, 2.5, 'iron', 1, .075, [0, 0, Math.PI / 2]);
  for (const side of [-1, 1]) {
    const x = side * 1.11;
    s.torus([x, -.1, .15], .59, .045, 'iron', [0, Math.PI / 2, 0]);
    s.torus([x, -.1, .15], .54, .045, 'woodDark', [0, Math.PI / 2, 0]);
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5;
      s.box([x, -.1 + Math.cos(angle) * .27, .15 + Math.sin(angle) * .27], [.075, .52, .045], 'woodLight', .74, [angle, 0, 0]);
    }
    s.box([side * .64, -.02, 1.65], [.08, .10, 1.9], 'woodDark');
  }
  for (let i = 0; i < 4; i++) {
    const x = -.44 + i % 2 * .85, z = -.55 + Math.floor(i / 2) * .8;
    s.sphere([x, .42, z], [.38, .29, .46], 'linen', .45 + i * .025);
    s.cylinder([x, .72, z -.1], .1, .11, 'woodDark');
  }
}

function floorMarker(s) { s.box([0, 0, 0], [.2, .015, .16], 'wood', .8); }
function routeMarker(s) { s.box([0, 0, 0], [.16, .015, .08], 'woodDark'); }
function sewingCase(s) {
  s.box([0, .13, 0], [.62, .26, .42], 'woodDark');
  s.box([0, .27, 0], [.65, .05, .45], 'wood');
  s.box([0, .15, .22], [.08, .11, .02], 'brass');
  for (const x of [-.28, .28]) s.box([x, .13, .215], [.035, .26, .015], 'brass', .7);
}
function hearthRemains(s) {
  s.box([0, -.02, 0], [1.38, .07, .7], 'black', .45);
  for (let i = 0; i < 14; i++) s.sphere([-.62 + seeded(i) * 1.25, seeded(i + 9) * .04, -.25 + seeded(i + 20) * .5], [.06 + seeded(i) * .12, .04, .06], 'black', .6 + seeded(i + 1) * .2);
  s.box([-.2, .055, .03], [.53, .03, .34], 'leather', .53, [0, .22, 0]);
  s.box([.28, .03, -.03], [.45, .018, .32], 'paper', .35, [0, -.2, 0]);
  cloth(s, .1, .08, .14, .65, .23, 'black');
}
function workBundle(s) {
  cloth(s, 0, .035, 0, .85, .48, 'blue');
  cloth(s, .06, .065, -.07, .55, .38, 'linen');
  sewingThings(s, -.2, .11, 0);
}

function candlestick(s) {
  s.cylinder([0, .04, 0], .21, .07, 'brass');
  s.cylinder([0, .25, 0], .053, .4, 'brass');
  s.cylinder([0, .43, 0], .12, .05, 'brass');
  s.cylinder([0, .56, 0], .055, .23, 'blue');
  s.torus([.19, .13, 0], .14, .025, 'brass', [0, .2, -.23]);
  s.box([.035, .52, .045], [.035, .15, .025], 'blue', .88);
}

function broom(s, x, z) {
  s.cylinder([x, .88, z], .022, 1.65, 'woodLight', .85, .025, [0, 0, -.13]);
  s.box([x -.1, .14, z], [.23, .25, .07], 'woodLight', .82);
  for (let i = 0; i < 9; i++) s.box([x -.21 + i * .027, .12, z + .025], [.01, .23, .025], 'wood', .7 + seeded(i) * .4);
}

await generate();
