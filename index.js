const mongoose = require('mongoose');
const express = require('express')
const fileUpload = require('express-fileupload')
const http = require('http')
const bcrypt = require('bcrypt');
const cors = require('cors')
const shortid = require('shortid')
const Account = require('./models/account.model.js');
const e = require('cors');
const fs = require('fs')
const ExpressPeerServer = require('peer').ExpressPeerServer;

const uri = "mongodb+srv://tuann2327:2327Tm@i@cluster0.urthv.mongodb.net/AnoChatDb?retryWrites=true&w=majority";
const app = express()
const httpServer = http.createServer(app)
const port = process.env.PORT || 8080


app.use(express.urlencoded({extended: true}));
app.use(express.json({}));
app.use(cors())
app.use('/peerjs', ExpressPeerServer(httpServer))
app.use(fileUpload());

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
const MatchingUser = []


function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

const removeFromMatchingList = (id) =>{
    MatchingUser.splice(MatchingUser.indexOf(user => user.data.id === id),1)
}

io.on("connection", socket => {
    console.log(socket.id)
  // or with emit() and custom event names

  // handle the event sent with socket.send()
    socket.on('joinMatching',(data)=>{
        MatchingUser.push({data:data,socketid:socket.id})
        const WaitingUser = MatchingUser.filter(user => user.data.id !== data.id)
        if(WaitingUser.length > 0){
            const rand = getRandomInt(WaitingUser.length)
            const roomid = WaitingUser[rand].data.id + data.id
            io.to(socket.id).emit('foundMatching',{roomid:roomid,user:WaitingUser[rand].data.username})
            io.to(WaitingUser[rand].socketid).emit('foundMatching',{roomid:roomid,user:data.username})
            removeFromMatchingList(data.id)
            removeFromMatchingList(WaitingUser[rand].data.id)

            console.log(MatchingUser)
        } 
    })

    socket.on('leaveMatching',data=>{
        removeFromMatchingList(data.id)
        console.log(MatchingUser)
    })

    socket.on('joinRoomID',data=>{
        socket.leave('general')
        socket.join(data.id)
        socket.emit("onBackChat",{type:'announce',user:'Bạn và '+data.user,msg:'đã kết nối thành công'})
    })
    socket.on('leaveRoomID',id=>{
        socket.broadcast.to(id).emit("onBackChat",{type:'announce',user:'Đối phương',msg:'đã rời khỏi phòng chat !!!'})
        socket.leave(id)
        socket.join('general')
    })

    socket.on("joinVideoChat",(data)=>{
        //data with name and id
        console.log(data + " joined video chat")
        socket.broadcast.emit("joinVideoChat",data)
    })

    socket.on("videoClose",(data)=>{
        //data with name and id
        console.log(data + " left video chat")
        io.emit("videoClose",data)
    })

  socket.on("onChat", (data) => {
    console.log(data.roomid)
    if(data.roomid) io.to(data.roomid).emit("onBackChat",{type:data.type,user:data.user,msg:data.msg,gender:data.gender})
    else io.to('general').emit("onBackChat",{type:data.type,user:data.user,msg:data.msg,gender:data.gender})
  });

  socket.on("onOnline",(data) =>{
    onlineUser.push({id:socket.id,data})
    socket.join('general')
    io.to('general').emit("onBackChat",{type:'announce',user:data.username,msg:'Has joined the chat',onlineUser})
  })

  socket.on("disconnect", (reason) => {
      console.log(socket.id)
      console.log(onlineUser)
    const logoutUser = onlineUser.find(user => user.id === socket.id)
    if(logoutUser){
        onlineUser.splice(onlineUser.indexOf(logoutUser),1)
        io.to('general').emit("onBackChat",{type:'announce',user:logoutUser.data.username,msg:'Has left the chat',onlineUser})
    } 
  });

});

//socket.io



app.get('/api/accounts/avt/:gender/:username', (req, res) => {
    
    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }
    const name = req.params.username
    const gender = req.params.gender
    const rand = getRandomInt(5).toString()
    let avt ='haha'
    try {
        if (fs.existsSync(__dirname+`/avt/${name}.jpg`)) {
            console.log('haha')
            avt = __dirname+`/avt/${name}.jpg`
        }else{
            avt = __dirname+`/avt/${gender+rand}.jpg`
        }
      } catch(err) {
            console.log(err)
      }
    res.sendFile(avt)
    
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

app.post('/api/accounts/setavt/:accountid', async (req, res) => {
    if(!req.files) res.send('error!')
    else{
        const id = req.params.accountid
        let sampleFile = req.files.file;
        sampleFile.mv(`./avt/${id}.jpg`, function(err) {
            if (err)
            return res.status(500).send(err);
        
            res.send('File uploaded!');
        });
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


