const express = require('express')
const { connectToDb, getDb } = require('./db')
const cors = require('cors')
const bodyParser = require('body-parser')
const socketIo = require("socket.io");
const http = require("http");
const { debug, error } = require('console');
const { dbNewRoom, dbGetRoomByID, dbGetPlayerByID, dbAddPlayer, dbUpdatePlayer, dbGetAllPlayers, dbGetPlayerBySocketID, dbUpdateRoom, dbNewResult, dbGetresultByRoomID, dbDeleteResultByRoomId } = require('./dbActions');

const app = express()


const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
     origin: "*", // Allow requests from React app
    methods: ["GET", "POST"],
  },
});




// app.use(bodyParser.urlencoded({ extended: false }));

// app.use(bodyParser)

let db;
connectToDb((err) => {
  if (!err) {
    db = getDb();
    console.log("connected to database");
    app.listen(3000);
  } else {
    console.log(err);
  }
});

const addPlayerToRoom = async (data, callback) => {
  dbGetRoomByID(db, data.room).then(result =>{
    //  console.log(result);
     const room = result
      if(room){
        // room found
        if(room.status == 'open'){
          dbGetPlayerByID(db, data.playerID).then(result => {
            const player = result
            if(player){
              const updatePlayer = {
                ...player,
                socketID: data.socketID,
                status: 'online',
                room: {
                  roomID: room.roomID,
                  roomUID: room.roomUID,
                  joined: Date.now()
                }
              }
              dbUpdatePlayer(db, updatePlayer).then(result => {
                callback({
                  status: true,
                  data: {
                    player: result,
                    room: room,
                  },
                  error: false,
                });
              }).catch(error => {
                console.log(error)
                callback({
                  status: false,
                  data: false,
                  error: "Database Error",
                });
              })
            }else{
              const newPlayer = {
                name: data.name,
                playerID: data.playerID,
                socketID: data.socketID,
                status: 'online',
                room: {
                  roomID: room.roomID,
                  roomUID: room.roomUID,
                  joined: Date.now()
                }
              }
              dbAddPlayer(db, newPlayer).then(result => {
                callback({
                  status: true,
                  data: {
                    player: newPlayer,
                    room: room
                  },
                  error: false
                 })
              }).catch(error => {
                 callback({
                   status: false,
                   data: false,
                   error: 'Database Error',
                 });
              })
            }
            // console.log(result)
          })
        }else{
           callback({
             status: false,
             data: false,
             error: "Unable to join room",
           });
        }
      }else{
        // no room found
         callback({
           status: false,
           data: false,
           error: "Unable to join room",
         });
      }
  }).catch(err => {
     callback({
       status: false,
       data: false,
       error: "Database Error",
     });
  })
}

const removePlayerFromRoom = async (socketID, callback) => {
  // console.log(socketID)
  dbGetPlayerBySocketID(db, socketID).then(result => {
    // console.log(result)
    const player = result
    if(player){
       dbGetRoomByID(db, player.room.roomID).then(result => {
        const room = result
        const newPlayer = {
          ...player,
          status: 'offline',
          room: {
            roomID: false,
            roomUID: false,
            joined: false
          }
        }
        dbUpdatePlayer(db, newPlayer).then(result => {
          callback({
            status: true,
           data: {player: result,
            room: room},
            error: false
          })
        }).catch(error => {
          callback({
            status: false,
            data: false,
            error: "Database Error",
          });
        })
       }).catch(error => {
        callback({
          status: false,
          data: false,
          error: "Database Error",
        });
       });
    }else{
      callback({
        status: false,
        data: false,
        error: "Player unknown",
      });
    }
  } ).catch(error => {
    callback({
      status: false,
      data: false,
      error: "Database Error",
    });
  })
}

const startGame = async (data, callback) => {
   console.log("game started", data);
     const newData = {
       roomID: data.room.roomID,
       roomUID: data.room.roomUID,
       createdAt: data.room.createdAt,
       status: 'closed',
       players: data.players.map(player => ({
        ...player,
        eliminated: false
     })),
     };
     dbUpdateRoom(db, newData).then(result => {
      console.log(result)
      callback({
        status: true,
        data: result,
        error: false
      })
     }).catch(error => {
      callback({
        status: false,
        data: false,
        error: "Database Error",
      });
     })
}

const getPlayersByRoom = async (data, callback) => {
  dbGetAllPlayers(db).then(players => {
    // console.log(data)
    const result = players.filter(function(player){
      return player.room.roomID == data.roomID
    }).sort((a, b) => a.room.joined - b.room.joined)
    callback({ 
      status: true,
      data: result,
      error: false
    })
  }).catch(error => {
    console.log(error)
     callback({
       status: false,
       data: false,
       error: 'Database Error',
     });
  })
}



io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  socket.on('joinroom', (data) => {
    // console.log(data)
    addPlayerToRoom({...data, socketID: socket.id}, ({status: playerStatus, data: playerData, error: playerError })=>{
      if(playerStatus){
          getPlayersByRoom(playerData.room, ({ status: roomPlayerStatus, data: roomPlayerData, error: roomPlayerError }) => {
            if(roomPlayerStatus){
              if(roomPlayerData.length <= 4){
                 socket.join(Number(data.room));
                 io.to(Number(data.room)).emit("users", {
                   player: playerData.player,
                   room: playerData.room,
                   players: roomPlayerData,
                   action: "joined",
                 });
              }else{
                dbUpdatePlayer(db, {...playerData.player, socketID: false, status: 'offline', room: {
                  roomID: false,
                  roomUID: false,
                  joined: false
                } }).then(result => {
                  // room full
                    io.to(socket.id).emit('joinError', 'This game is full')
                }).catch(error => {
                    io.to(socket.id).emit("joinError", "Database Error");
                })
              }
            }else{
              io.to(socket.id).emit("joinError", roomPlayerError);
            }
          });
      }else{
         console.log(playerError)
         console.log(socket.id)
         io.to(socket.id).emit("joinError", playerError);
      }
    })
  })

  socket.on('play', (data) => {
    console.log('play', data)
    io.to(Number(data.room.roomID)).emit('play', data)
  })

  socket.on('startGame', (data) => {
    startGame(data, ({ status: startStatus, error: startError, data: startData }) =>{
      console.log(startData, startStatus, startError)
      if(startStatus){
        io.to(Number(data.room.roomID)).emit("startGame", {
          room: startData,
          player: data.player,
          players: startData.players,
          gameInfo: data.gameInfo
        });
      }else{

      }
    })
    // dbUpdateRoom(db, data.room).then(result => {
    //   console.log(result)
    // }).catch(error => {
    //   console.log(error)
    // })
  })


  socket.on('timeout', (data) => {
      console.log("timeout", data);
      io.to(Number(data.room.roomID)).emit("timeout", data);
  })

  // Send a message to the client
  // socket.emit("messageFromServer", "Hello from server!");

  // socket.on("messageFromClient", (data) => {
  //   console.log(data);
  // });

  socket.on('endGame', (data) => {
    io.to(Number(data.room.roomID)).emit(
      "ended",
        `${ data.player.name } ended the game`
    );
  })

  socket.on("resultEnd", (data) => {
    console.log("resultEnd", data);
    dbGetRoomByID(db, data.room.roomID).then(result => {
      console.log('res', result)
      if(result){
         let playerResults = [];
        data.eliminated.forEach(player =>{
          const findPlayer = data.room.players.find(function(el){ return el.color.color == player })
          if(findPlayer){
            playerResults.push(findPlayer)
          }
        })
        playerResults = playerResults.reverse()
        const newResult = {
          roomID: result.roomID,
          roomUID: result.roomID,
          results: playerResults
        }
        dbDeleteResultByRoomId(db, newResult.roomID).then(result => {
          dbNewResult(db, newResult)
            .then((result) => {
              io.to(Number(newResult.roomID)).emit("results", newResult);
            })
            .catch((error) => {});
        }).catch(error => {

        })
      }
    })
  });


  // Handle client disconnect

  const disconnect = () => {
     removePlayerFromRoom(
       socket.id,
       ({ status: playerStatus, data: playerData, error: playerError }) => {
         if (playerStatus) {
           getPlayersByRoom(
             playerData.room,
             ({
               status: roomPlayerStatus,
               data: roomPlayerData,
               error: roomPlayerError,
             }) => {
               if (roomPlayerStatus) {
                 console.log(playerData.room.players);
                 if (!playerData.room.players) {
                   // game has started
                   io.to(Number(playerData.room.roomID)).emit("users", {
                     player: playerData.player,
                     room: playerData.room,
                     players: roomPlayerData,
                     action: "left",
                   });
                 } else {
                   const playerList1 = playerData.room.players;
                   // console.log(playerList1, roomPlayerData)
                   let newPlayerList = [];
                   playerList1.forEach((player) => {
                     const findRoom = roomPlayerData.find(function (el) {
                       return el.playerID == player.playerID;
                     });
                     const newPlayer = {
                       ...player,
                       status: findRoom ? "online" : "offline",
                     };
                     newPlayerList.push(newPlayer);
                   });
                   // console.log(newPlayerList)
                   if (newPlayerList.length == playerList1.length) {
                     io.to(Number(playerData.room.roomID)).emit("users", {
                       player: playerData.player,
                       room: playerData.room,
                       players: newPlayerList,
                       action: "left",
                     });

                     if (roomPlayerData.length <= 1) {
                       io.to(Number(playerData.room.roomID)).emit(
                         "ended",
                         "no players left in the game"
                       );
                     }
                   }
                 }
               } else {
               }
             }
           );
         }
       }
     );
  }

  socket.on('leave', () => {
     disconnect()
  })

  socket.on("disconnect", () => {
    disconnect()
    console.log("Client disconnected", socket.id);
  });
});



const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


app.use(bodyParser.json());

app.use(cors());

app.get("/", (req, res) => {
  res.send("server working");
});

app.post('/room/create', (req, res)=>{
  const roomID = Number(req.body.roomID);
  const newRoom = {
    roomID: roomID,
    roomUID: crypto.randomUUID(),
    createdAt: Date.now(),
    status: 'open'
  }
  dbNewRoom(db, newRoom).then(result =>{
    res.status(200).json(newRoom)
  }).catch(error => {
     res.status(500).send('Database Error');
  })
  // console.log(roomID)
})


app.get('/game/result/:roomID', (req, res) => {
  console.log(Number(req.params.roomID))
  dbGetresultByRoomID(db, Number(req.params.roomID))
    .then((result) => {
      console.log(result)
      if(result){
        res.status(200).json(result);
      }else{
        res.status(500).send("Unable to find Result");
      }
    })
    .catch((error) => {
        res.status(500).send("Database Error");
    });
})


app.post('/room/join', (req, res)=>{
  const roomID = Number(req.body.roomID);
  console.log(roomID)
  dbGetRoomByID(db, roomID).then(result => {
    console.log(result)
    if(result){
      res.status(200).json(result);
    }else{
       res.status(500).send("Invalid Room ID");
    }
  }).catch(error => {
    res.status(500).send("Database Error");
  })
})
