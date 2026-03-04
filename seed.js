
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
 await prisma.offer.create({
  data:{
   id:"offer_1",
   name:"10% off coffee"
  }
 })
 console.log("Seeded offer")
}

main().finally(()=>prisma.$disconnect())
