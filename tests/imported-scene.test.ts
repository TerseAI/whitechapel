import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { prepareImportedScene } from '../frontend/src/scenes/imported-scene';

test('imported sets cast and receive light without mutating the cached model', () => {
  const source = new Group();
  const furniture = new Group();
  const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  furniture.add(mesh); source.add(furniture);
  const scene = prepareImportedScene(source);
  const rendered = scene.children[0].children[0] as Mesh;
  assert.notEqual(rendered, mesh);
  assert.equal(rendered.castShadow, true);
  assert.equal(rendered.receiveShadow, true);
  assert.equal(mesh.castShadow, false);
  assert.equal(mesh.receiveShadow, false);
  assert.equal(rendered.geometry, mesh.geometry);
});
