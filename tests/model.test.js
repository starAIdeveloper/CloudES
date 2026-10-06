import {test} from 'node:test';import assert from 'node:assert/strict';
import {sampleModel,validateModel,isVisible,distance,geo,origin} from '../src/model.js';
test('sample model validates and uses unique IDs',()=>{const m=sampleModel();assert.equal(validateModel(m),m);assert.ok(m.elements.length>150);assert.equal(new Set(m.elements.map(e=>e.id)).size,m.elements.length);});
test('invalid dimensions and duplicate IDs reject',()=>{const m=sampleModel();m.elements[0].size[0]=-1;assert.throws(()=>validateModel(m));const d=sampleModel();d.elements[1].id=d.elements[0].id;assert.throws(()=>validateModel(d));});
test('nonfinite geometry, excessive floors and bad colors reject',()=>{for(const mutate of [e=>e.position[0]=Infinity,e=>e.floor=101,e=>e.color='red']){const m=sampleModel();mutate(m.elements[0]);assert.throws(()=>validateModel(m));}});
test('floor category and hidden filters compose',()=>{const e=sampleModel().elements[0],f={categories:new Set(['Slabs']),floor:'0',hidden:new Set()};assert.equal(isVisible(e,f),true);f.floor='1';assert.equal(isVisible(e,f),false);f.floor='all';f.hidden.add(e.id);assert.equal(isVisible(e,f),false);f.hidden.clear();f.categories.clear();assert.equal(isVisible(e,f),false);});
test('distance is true XYZ length',()=>assert.equal(distance([0,0,0],[3,4,12]),13));
test('local coordinates convert around documented origin',()=>{assert.deepEqual(geo(0,0),origin);assert.ok(geo(100,100).latitude<origin.latitude);assert.ok(geo(100,100).longitude>origin.longitude);});
