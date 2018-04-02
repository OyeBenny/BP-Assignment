//I apologize if I didn't cover all the use cases + test cases
    const express = require('express')

//Setup and start the Express server
    const app = express()
    const http = require('http').Server(app)

//Start Socket.io to server
    const io = require('socket.io')(http)

//Serve web app directory
    app.use(express.static('public'))

//Feedback to see events on the front end
    io.on('connection', (socket) => {
    console.log(`User Connected - Socket ID ${socket.id}`)

//Remember the room so socket doesnt lose it
    let currentRoom = null

//What to do if you want to join a particular channel
    socket.on('JOIN', (roomName) => {

//Get room
    let room = io.sockets.adapter.rooms[roomName]

//Checks to see if there's more than 1 person in the room, if there is then request will be rejected
//Change this if you want to have more than 2 entities in this transaction, unsure if it will work. Should write a test here.
    if (room && room.length > 1) {
        
//Tell front end user that they got rejected 
      io.to(socket.id).emit('ROOM_FULL', null)

//Tell the front end users on the channel that someone attempted to join
      socket.broadcast.to(roomName).emit('INTRUSION_ATTEMPT', null)
        } else {
            
//Leave the chat room
      socket.leave(currentRoom)

//Tell the chat room that someone left the room
      socket.broadcast.to(currentRoom).emit('USER_DISCONNECTED', null)

//Actually join the room
      currentRoom = roomName
      socket.join(currentRoom)

//Tell front end user that they have joined the room.
      io.to(socket.id).emit('ROOM_JOINED', currentRoom)

//Notify room that user has joined
      socket.broadcast.to(currentRoom).emit('NEW_CONNECTION', null)
    }
  })

//Tell the room that a message is in the works
    socket.on('MESSAGE', (msg) => {
        console.log(`New Message - ${msg.text}`)
        socket.broadcast.to(currentRoom).emit('MESSAGE', msg)
    })

//Reveal the public key to the front end
    socket.on('PUBLIC_KEY', (key) => {
        socket.broadcast.to(currentRoom).emit('PUBLIC_KEY', key)
    })

//Tell front end user that they have been disconnected
    socket.on('disconnect', () => {
        socket.broadcast.to(currentRoom).emit('USER_DISCONNECTED', null)
    })
})

//Start the server in its local port
    const port = process.env.PORT || 3000
    http.listen(port, () => {
    console.log(`BitPay Assignment listening on port ${port}.`)
    })
