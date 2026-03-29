const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");
const { Rcon } = require("rcon-client");

const app = express();
app.use(express.json());
app.use(cors());

const CASHFREE_APP_ID="YOUR_APP_ID";
const CASHFREE_SECRET="YOUR_SECRET";

const DB="orders.json";

/* CREATE ORDER */
app.post("/create-order", async (req,res)=>{
const {amount,ign,item}=req.body;
const orderId="order_"+Date.now();

let orders=[];
if(fs.existsSync(DB)) orders=JSON.parse(fs.readFileSync(DB));

orders.push({orderId,ign,item,amount,status:"pending"});
fs.writeFileSync(DB,JSON.stringify(orders,null,2));

const cf=await axios.post("https://api.cashfree.com/pg/orders",{
order_id:orderId,
order_amount:amount,
order_currency:"INR",
customer_details:{
customer_id:ign,
customer_email:ign+"@mail.com",
customer_phone:"9999999999"
}
},{
headers:{
"x-client-id":CASHFREE_APP_ID,
"x-client-secret":CASHFREE_SECRET,
"x-api-version":"2022-09-01"
}
});

res.json(cf.data);
});

/* WEBHOOK */
app.post("/webhook", async (req,res)=>{
const data=req.body;

if(data.type==="PAYMENT_SUCCESS_WEBHOOK"){
const ign=data.data.customer_details.customer_id;
const orderId=data.data.order.order_id;

let orders=JSON.parse(fs.readFileSync(DB));
let order=orders.find(o=>o.orderId===orderId);

if(order){
order.status="paid";
fs.writeFileSync(DB,JSON.stringify(orders,null,2));

let cmd="";

/* AUTO DETECT */
if(order.item.includes("Prime")) cmd=`lp user ${ign} parent add prime`;
if(order.item.includes("Leorix+")) cmd=`lp user ${ign} parent add leorixplus`;
if(order.item.includes("Mythic")) cmd=`lp user ${ign} parent add mythic`;

/* RCON */
const rcon=await Rcon.connect({
host:"play.leorixmc.fun",
port:25575,
password:"YOUR_RCON_PASSWORD"
});

if(cmd) await rcon.send(cmd);
await rcon.end();
}
}

res.send("ok");
});

/* ADMIN */
app.get("/orders",(req,res)=>{
if(!fs.existsSync(DB)) return res.json([]);
res.json(JSON.parse(fs.readFileSync(DB)));
});

/* STATUS */
app.get("/status", async (req,res)=>{
try{
const r=await axios.get("https://api.mcsrvstat.us/2/play.leorixmc.fun");
res.json(r.data);
}catch{
res.json({online:false});
}
});

app.listen(3000,()=>console.log("Server running"));
