import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profile,aggregate} from '../api/domain.js';
test('questionário rejeita incompletos e índices inválidos',()=>{for(const a of [[],[0,1,2,3],[0,1,2,3,4],[0,1,2,3,'1']])assert.throws(()=>profile(a));});
test('cada característica pode predominar, empates são determinísticos',()=>{for(let i=0;i<4;i++)assert.equal(profile(Array(5).fill(i)).trait,i);assert.equal(profile([0,0,1,1,2]).trait,0);});
test('telão não retorna respostas individuais nem identificadores',()=>{assert.deepEqual(aggregate({people:{secret:{profile:{trait:2},answer:'Privada'},other:{}}}),{participants:2,completed:1,profiles:[0,0,1,0],teams:1});});
