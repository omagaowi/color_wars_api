const express = require('express')
const { connectToDb, getDb } = require('./db')
const cors = require('cors')
const bodyParser = require('body-parser')
const socketIo = require("socket.io");
const http = require("http");

const app = express()


const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
     origin: "*", // Allow requests from React app
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected");

  // Send a message to the client
  socket.emit("messageFromServer", "Hello from server!");

  socket.on("messageFromClient", (data)=>{
    console.log(data)
  });

  // Handle client disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


// app.use(bodyParser.urlencoded({ extended: false }));

// app.use(bodyParser)

// let db;
// connectToDb((err) => {
//   if (!err) {
//     db = getDb();
//     console.log("connected to database");
//     app.listen(3000);
//   } else {
//     console.log(err);
//   }
// });



const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


app.use(bodyParser.json());

app.use(cors());

app.get("/", (req, res) => {
  res.send("server working");
});

app.post('/createroom', (req, res)=>{
  const roomID = req.body.room
  const newRoom = {
    roomID: roomID,
    status: 'active',
    expires: false
  }

  db.collection('rooms').findOne({ roomID: roomID }).then((data)=>{
    console.log(data)
    if(data){
      res.json({
        error: 'room already exists',
        data: false
      })
    }else{
      db.collection('rooms').insertOne(newRoom).then(()=>{
            res.json({
              error: false,
              data: 'room created successfully'
            })
        }).catch((err)=>{
             res.json({
               error: "error creating room",
               data: false,
             });
        })
    }
  }).catch((err)=>{
       res.json({
         error: "error creating room",
         data: false,
       });
  })
  // console.log(roomID)
})


app.post('/joinroom', (req, res)=>{
  const roomID = req.body.room
  db.collection('rooms').findOne({ roomID: roomID }).then((data) => {
    if(data){
      if(data.status == 'active'){
          res.json({
            error: false,
            data: "room joined successfully",
          });
      }else{
        res.json({
          error: "unable to join game!",
          data: false,
        });
      }
    }else{
       res.json({
         error: "room does not exist!",
         data: false,
       });
    }
  }).catch((err) => {

  })
})
