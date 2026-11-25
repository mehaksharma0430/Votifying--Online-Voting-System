const router=require('express').Router();
const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const User=require('../models/user');
const challenges=new Map(), limits=new Map();
const demo=()=>process.env.OTP_MODE==='demo'&&process.env.NODE_ENV!=='production';
const configured=()=>process.env.OTP_MODE==='twilio'&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_VERIFY_SERVICE_SID;
function normalize(value){if(typeof value!=='string')throw Error('Enter a valid Indian mobile number.');const n=value.replace(/[\s()-]/g,'').replace(/^\+91/,'');if(!/^[6-9]\d{9}$/.test(n))throw Error('Enter a 10-digit Indian mobile number.');return '+91'+n;}
function allow(key,max){const now=Date.now();let v=limits.get(key);if(!v||v.until<now){v={count:0,until:now+15*60*1000};limits.set(key,v)}if(v.count>=max)return false;v.count++;return true;}
async function twilio(path,data){const r=await fetch('https://verify.twilio.com/v2/Services/'+encodeURIComponent(process.env.TWILIO_VERIFY_SERVICE_SID)+'/'+path,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(process.env.TWILIO_ACCOUNT_SID+':'+process.env.TWILIO_AUTH_TOKEN).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data),signal:AbortSignal.timeout(15000)});const b=await r.json();if(!r.ok)throw Error('SMS verification is unavailable or the code has expired. Please try again later.');return b;}
router.get('/config',(req,res)=>res.json({mode:demo()?'demo':configured()?'sms':'unavailable'}));
router.post('/request',async(req,res,next)=>{try{
 const phone=normalize(req.body.phone);if(!demo()&&!configured())return res.status(503).json({error:{message:'SMS login is not configured. Use username login for now.'}});
 const now=Date.now();for(const [k,v] of challenges)if(v.expires<now)challenges.delete(k);for(const [k,v] of limits)if(v.until<now)limits.delete(k);
 const active=[...challenges.entries()].find(([id,c])=>c.phone===phone&&c.expires>now&&c.attempts<5);
 // Local demos reuse the active code, so retries and tab switches do not exhaust SMS quotas.
 if(demo()&&active&&active[1].isDemo){const [id,c]=active;return res.json({challengeId:id,expiresIn:Math.ceil((c.expires-now)/1000),mode:'demo',demoCode:c.demoCode,message:'Existing local demo code. No SMS sent.'});}
 if(!demo()&&active&&now-active[1].created<30000)return res.status(429).json({error:{message:'Wait 30 seconds before requesting another code.'}});
 if(!allow('ip:'+req.ip,demo()?60:15)||!allow('phone:'+phone,demo()?30:4))return res.status(429).json({error:{message:'Too many OTP requests. Try again in 15 minutes.'}});
 const isDemo=demo();
 const id=crypto.randomUUID(),code=isDemo&&phone==='+919000000002'?'123456':crypto.randomInt(100000,1000000).toString();
 if(!isDemo)await twilio('Verifications',{To:phone,Channel:'sms'});
 for(const [key,value] of challenges)if(value.phone===phone)challenges.delete(key);
 challenges.set(id,{phone,hash:crypto.createHash('sha256').update(code).digest(),created:now,expires:now+5*60*1000,attempts:0,isDemo,busy:false,...(isDemo?{demoCode:code}:{})});
 res.json({challengeId:id,expiresIn:300,mode:isDemo?'demo':'sms',...(isDemo?{demoCode:code}:{}),message:isDemo?'Local demo only. No SMS sent.':'OTP requested by SMS.'});
 }catch(e){next({status:400,message:e.message})}});
router.post('/verify',async(req,res,next)=>{try{
 const {challengeId,code}=req.body,c=challenges.get(challengeId);
 if(!c||c.expires<Date.now()||c.attempts>=5)throw Error('Code expired or unavailable. Request a new OTP.');
 if(c.busy)throw Error('Verification is already in progress.');
 c.attempts++;if(typeof code!=='string'||!/^\d{6}$/.test(code))throw Error('Enter the 6-digit OTP.');
 c.busy=true;let approved=false;
 try{approved=c.isDemo?crypto.timingSafeEqual(c.hash,crypto.createHash('sha256').update(code).digest()):(await twilio('VerificationCheck',{To:c.phone,Code:code})).status==='approved'}finally{c.busy=false}
 if(!approved)throw Error('Incorrect OTP. Please try again.');
 challenges.delete(challengeId);
 // Demo identities cannot log in to real SMS-verified accounts.
 const phoneIdentity=(c.isDemo?'demo:':'sms:')+c.phone;
 let user=await User.findOne({phoneIdentity});
 if(!user){try{user=await User.create({phoneIdentity,username:(c.isDemo?'Demo_':'Citizen_')+crypto.randomBytes(5).toString('hex'),password:crypto.randomBytes(32).toString('hex')})}catch(e){if(e.code!==11000)throw e;user=await User.findOne({phoneIdentity});if(!user)throw e;}}
 const token=jwt.sign({id:user.id,username:user.username},process.env.SECRET,{expiresIn:'7d'});
 res.json({id:user.id,username:user.username,token,mode:c.isDemo?'demo':'sms'});
 }catch(e){next({status:400,message:e.message})}});
module.exports=router;
