const assert=require('node:assert/strict');
(async()=>{let token;async function call(path,method='GET',body){const r=await fetch('http://127.0.0.1:4000/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
let r=await call('/auth/otp/config');assert.equal(r.data.mode,'demo');
r=await call('/auth/otp/request','POST',{phone:'123'});assert.equal(r.status,400);
r=await call('/auth/otp/request','POST',{phone:'9000000001'});assert.equal(r.status,200);const c=r.data;assert.match(c.demoCode,/^\d{6}$/);
r=await call('/auth/otp/verify','POST',{challengeId:c.challengeId,code:'000000'});assert.equal(r.status,400);
r=await call('/auth/otp/verify','POST',{challengeId:c.challengeId,code:c.demoCode});assert.equal(r.status,200);token=r.data.token;
r=await call('/auth/otp/verify','POST',{challengeId:c.challengeId,code:c.demoCode});assert.equal(r.status,400);
r=await call('/civic','POST',{kind:'report',role:'Municipal Corporation',state:'Maharashtra',locality:'Demo city (test)',area:'Test ward',topic:'QA only — test report',message:'Temporary functional test. No real grievance.',requestedAction:'No action requested.'});assert.equal(r.status,201);assert.equal(r.data.status,'Saved locally — not sent');const id=r.data._id;
r=await call('/civic');assert(r.data.some(x=>x._id===id));
r=await call('/civic','POST',{kind:'feedback',role:'MLA',state:'Delhi',locality:'Test',topic:'Invalid rating',message:'Test',rating:6});assert.equal(r.status,400);
token=undefined;r=await call('/civic');assert.notEqual(r.status,200);
r=await call('/auth');assert.equal(r.status,404);
console.log('PASS: demo OTP generation, invalid phone/code, login, single-use OTP, private report persistence, rating validation, anonymous access denied, account list not exposed.');})().catch(e=>{console.error(e);process.exit(1)});
