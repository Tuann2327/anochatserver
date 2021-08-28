const mongoose = require('mongoose');
const express = require('express')
const http = require('http')
const bcrypt = require('bcrypt');
const cors = require('cors')
const shortid = require('shortid')
const Account = require('./models/account.model.js');
const e = require('cors');
const fs = require('fs')

const uri = "mongodb+srv://tuann2327:2327Tm@i@cluster0.urthv.mongodb.net/AnoChatDb?retryWrites=true&w=majority";
const app = express()
const httpServer = http.createServer(app)
const port = process.env.PORT || 8080


app.use(express.urlencoded({extended: true}));
app.use(express.json({}));
app.use(cors())

const io = require("socket.io")(httpServer,{
    cors: {
      origin: `*`,
      methods: ["GET", "POST"]
    }
  });

const saltRounds = 10;

mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true});


//socket.io
const onlineUser = []

io.on("connection", socket => {
    console.log(socket.id)
  // or with emit() and custom event names

  // handle the event sent with socket.send()
  socket.on("onChat", (data) => {
    io.emit("onBackChat",{type:data.type,user:data.user,msg:data.msg,gender:data.gender})
  });

  socket.on("onOnline",(data) =>{
    onlineUser.push({id:socket.id,data})
    io.emit("onBackChat",{type:'announce',user:data.username,msg:'Has joined the chat',onlineUser})
  })

  socket.on("disconnect", (reason) => {
      console.log(socket.id)
      console.log(onlineUser)
    const logoutUser = onlineUser.find(user => user.id === socket.id)
    if(logoutUser){
        onlineUser.splice(onlineUser.indexOf(logoutUser),1)
        io.emit("onBackChat",{type:'announce',user:logoutUser.data.username,msg:'Has left the chat',onlineUser})
    } 
  });

});

//socket.io



app.get('/api/accounts/avt/:gender/:accountid', (req, res) => {
    
    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }
    const id = req.params.accountid
    const gender = req.params.gender
    const rand = getRandomInt(5).toString()
    let avt ='haha'
    try {
        if (fs.existsSync(__dirname+`/avt/${id}.jpg`)) {
            avt = __dirname+`/avt/${id}.jpg`
        }else{
            avt = __dirname+`/avt/${gender+rand}.jpg`
        }
      } catch(err) {
            console.log(err)
      }
    res.sendFile(avt)
    
})

app.get('/api/accounts/:accountid', (req, res) => {

    res.send('Hello World!')
    console.log('alo')
    
})

app.get('/api/loginauth',async (req, res) => {

    try{
        const data = req.query 
        const foundAccount = await Account.findOne({$or : [{username: data.username},{email: data.username}]})
        const passwordMatch = await bcrypt.compare(data.password, foundAccount.password);
        if(passwordMatch){
            const account = await Account.findByIdAndUpdate({ _id: foundAccount._id }, { currentToken: shortid.generate() },{new:true})
            res.send({isMatched: true,token: account.currentToken})
        } 
        else throw 'Password incorrect'
    }catch(e){
        console.log(e)
        res.send({isMatched: false})
    }
    
})

app.post('/api/accounts/new', (req, res) => {
    const data = req.body
    bcrypt.hash(data.password, saltRounds, async (err, hash)=>{
        if(err){
            res.send({isCreated: false,error: 'Error occur! This account is not created.'})
        } else {
            try{
                const sameAccount = await Account.findOne({ $or: [ { username: data.username}, { email: data.email} ] })
                if(sameAccount){
                   if(sameAccount.username === data.username) res.send({isCreated: false,error: 'This Username has been used! please choose another one.'})
                   else res.send({isCreated: false,error: 'This Email has been used! please choose another one.'})
                }else{
                    const newAccount = await Account.create({username: data.username,email: data.email,password: hash})
                    res.send({isCreated: true,username: data.username})
                    console.log(newAccount)
                }
            }catch(e){
                console.log(e)
                res.send({isCreated: false,error: 'Error occur! This account is not created.'})
            }
        }
    });
})

app.post('/api/accounts/gender', async (req,res)=>{
    try{
        const data = req.body
        const foundAccount = await Account.findByIdAndUpdate(data.id,{gender: data.gender, age: data.age})
        res.send('done')
    }catch(e){
        console.log(e)
    }

})

app.post('/api/auth', async (req, res) => {

    const data = req.body
    const foundAccount = await Account.findOne({currentToken: data.token})
    if(foundAccount){
        res.send({isFound: true, accountInfo:{username:foundAccount.username,email:foundAccount.email,id:foundAccount._id,gender:foundAccount.gender,age:foundAccount.age}})
    }else{
        res.send({isFound: false})
    }
})

app.delete('/api/accounts/:accountid', (req, res) => {

    res.send('Hello World!')
    
})

httpServer.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})


// const Cat = mongoose.model('Cat', { name: String });

// const kitty = new Cat({ name: 'Zildjian' });
// kitty.save().then(() => console.log('meow'));


