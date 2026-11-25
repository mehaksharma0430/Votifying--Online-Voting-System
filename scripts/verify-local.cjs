const assert = require('node:assert/strict');
(async () => {
 const base='http://127.0.0.1:4000/api'; let token;
 async function call(path,method='GET',data) {const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()};}
 const account={username:'demo_'+Date.now(),password:require('node:crypto').randomBytes(15).toString('hex')};
 let r=await call('/auth/register','POST',account);assert.equal(r.status,201);token=r.data.token;
 r=await call('/auth/login','POST',account);assert.equal(r.status,200);token=r.data.token;
 r=await call('/polls','POST',{question:'Which technology would you like to learn?',options:['React','Node.js','MongoDB']});assert.equal(r.status,201);const id=r.data._id;
 r=await call('/polls/'+id,'POST',{answer:'React'});assert.equal(r.status,202);assert.equal(r.data.options[0].votes,1);
 r=await call('/polls/'+id,'POST',{answer:'React'});assert.equal(r.status,400);
 r=await call('/polls/'+id);assert.equal(r.data.options[0].votes,1);
 r=await call('/polls','POST',{question:'Temporary deletion check',options:['Yes','No']});const temporaryId=r.data._id;assert.equal(r.status,201);
 r=await call('/polls/'+temporaryId,'DELETE');assert.equal(r.status,202);
 console.log('PASS: registration, login, create, vote, duplicate-vote rejection, persisted result, delete. Demo poll: '+id);
})().catch(e=>{console.error(e);process.exit(1)});
