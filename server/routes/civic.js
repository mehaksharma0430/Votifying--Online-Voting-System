const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const schema = new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,required:true},kind:String,role:String,representative:String,state:String,locality:String,area:String,topic:String,rating:Number,message:String,requestedAction:String,created:{type:Date,default:Date.now},status:{type:String,default:'Saved locally — not sent'}});
const Civic = mongoose.model('CivicSubmission',schema);
const roles=['MLA','Chief Minister','Municipal councillor','Municipal Corporation','Other public authority'];
router.use(auth);
router.get('/',async(req,res,next)=>{try{res.json(await Civic.find({user:req.decoded.id}).sort({created:-1}).limit(100))}catch(e){next({status:400,message:e.message})}});
router.post('/',async(req,res,next)=>{try{
 const b=req.body, data={user:req.decoded.id};
 if(!['feedback','report'].includes(b.kind)||!roles.includes(b.role)) throw Error('Choose a valid submission type and authority.');
 for(const [key,max,required] of [['state',80,true],['locality',120,true],['area',150,false],['representative',120,false],['topic',160,true],['message',3000,true],['requestedAction',1000,b.kind==='report']]){
 const value=b[key]===undefined?'':b[key];if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error('Please provide valid '+key+' details.');data[key]=value.trim();}
 data.kind=b.kind;data.role=b.role;
 if(b.kind==='feedback'){if(!Number.isInteger(b.rating)||b.rating<1||b.rating>5)throw Error('Choose a rating from 1 to 5.');data.rating=b.rating;}
 const record=await Civic.create(data);res.status(201).json(record);
}catch(e){next({status:400,message:e.message})}});
module.exports=router;
