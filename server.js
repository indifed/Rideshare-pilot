
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { v4: uuid } = require('uuid')

const prisma = new PrismaClient()
const app = express()

app.use(express.json())

app.post('/sessions', async(req,res)=>{
 const id = uuid()
 const s = await prisma.session.create({
  data:{
   id,
   riderId:req.body.riderId || "demo",
   status:"CREATED"
  }
 })
 res.json(s)
})

app.post('/sessions/:id/start', async(req,res)=>{
 const s = await prisma.session.update({
  where:{id:req.params.id},
  data:{status:"STARTED"}
 })
 res.json(s)
})

app.post('/sessions/:id/engagement', async(req,res)=>{
 const e = await prisma.engagement.create({
  data:{
   id:uuid(),
   score:req.body.score,
   sessionId:req.params.id
  }
 })
 res.json(e)
})

app.post('/sessions/:id/end', async(req,res)=>{
 const token = uuid()
 const r = await prisma.reward.create({
  data:{
   id:uuid(),
   token,
   sessionId:req.params.id
  }
 })
 await prisma.session.update({
  where:{id:req.params.id},
  data:{status:"ENDED"}
 })
 res.json(r)
})

app.post('/redeem', async(req,res)=>{
 const reward = await prisma.reward.findUnique({
  where:{token:req.body.token}
 })

 if(!reward || reward.redeemed){
  return res.status(400).json({error:"invalid token"})
 }

 const updated = await prisma.reward.update({
  where:{token:req.body.token},
  data:{redeemed:true}
 })

 res.json(updated)
})

app.get('/metrics', async(req,res)=>{
 const sessions = await prisma.session.count()
 const rewards = await prisma.reward.count()
 const redeemed = await prisma.reward.count({where:{redeemed:true}})
 res.json({sessions,rewards,redeemed})
})

app.listen(process.env.PORT||8080,()=>{
 console.log("server running")
})
