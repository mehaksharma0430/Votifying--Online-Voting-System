const assert=require('node:assert/strict');
(async()=>{const base='http://127.0.0.1:4000/api';let token;async function call(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
let r=await call('/polls');assert(r.data.filter(p=>p.seedKey).length===6);assert(!r.data.some(p=>p._id==='6aec1f9cba1154316b319c89'));
r=await call('/auth/register','POST',{username:'qa_community_'+Date.now(),password:require('crypto').randomBytes(20).toString('hex')});assert.equal(r.status,201);token=r.data.token;
r=await call('/polls','POST',{question:'QA: Community validation',description:'Temporary test',category:'Environment',action:'Test only',options:['First','Second']});assert.equal(r.status,201);const id=r.data._id;assert.equal(r.data.description,'Temporary test');
r=await call('/polls/'+id,'POST',{answer:'Invalid'});assert.equal(r.status,400);
const concurrent=await Promise.all([call('/polls/'+id,'POST',{answer:'First'}),call('/polls/'+id,'POST',{answer:'Second'})]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[202,400]);
r=await call('/polls/'+id);assert.equal(r.data.options.reduce((n,o)=>n+o.votes,0),1);
r=await call('/polls/'+id,'DELETE');assert.equal(r.status,202);
r=await call('/polls','POST',{question:'Invalid',options:['Same','same']});assert.equal(r.status,400);
console.log('PASS: six civic polls, old demo hidden, registration, issue context saved, invalid option rejected, concurrent duplicate prevented, persisted vote, deletion, duplicate options rejected.');})().catch(e=>{console.error(e);process.exit(1)});
