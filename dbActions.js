const dbNewRoom = async (db, data) => {
    try {
         const result = await db.collection("rooms").insertOne(data);
         return result;
    } catch (error) {
        throw error
    }
}

const dbGetRoomByID = async (db, roomID) => {
    try {
        const result = await db.collection("rooms").findOne({
          roomID: Number(roomID),
        });
        return result
    } catch (error) {
        throw error
    }
}

const dbUpdateRoom = async (db, data) => {
    try {
      const result = await db.collection("rooms").findOneAndUpdate(
        { roomID: data.roomID }, // Filter to find the document
        { $set: data },
        { returnDocument: "after" } // Return the new document
      );
      return result;
    } catch (error) {
      throw error;
    }
}

const dbAddPlayer = async (db, data) => {
    try {
        const result = await db.collection('players').insertOne(data)
        return result
    } catch (error) {
        throw error
    }
}

const dbGetPlayerByID = async (db, playerID) => {
  try {
    const result = await db.collection("players").findOne({
      playerID: playerID,
    });
    return result;
  } catch (error) {
    throw error;
  }
};

const dbUpdatePlayer = async (db, data) => {
    try {
        const result = await db.collection("players").findOneAndUpdate(
          { playerID: data.playerID }, // Filter to find the document
          { $set: data },
          { returnDocument: "after" } // Return the new document
        );
          return result
    } catch (error) {
        throw error
    }
}

const dbGetAllPlayers = async (db) => {
    try {
        const players = []
        await db.collection('players').find().forEach(player => {
            players.push(player)
        });
        return players
    } catch (error) {
        throw error
    }
}

const dbGetPlayerBySocketID = async (db, socketID) => {
         try {
           const result = await db.collection("players").findOne({
             socketID: socketID,
           });
           return result;
         } catch (error) {
           throw error;
         }
}

module.exports = { dbNewRoom, dbGetRoomByID, dbAddPlayer, dbGetAllPlayers, dbGetPlayerByID , dbUpdatePlayer, dbGetPlayerBySocketID, dbUpdateRoom}