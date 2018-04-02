//Still new to Vue.js but this is to make sure its maintained
const vm = new Vue ({
  el: '#vue-instance',
    
  data () {
    return {
      cryptWorker: null,
      socket: null,
      originPublicKey: null,
      destinationPublicKey: null,
      messages: [],
      notifications: [],
      currentRoom: null,
      pendingRoom: Math.floor(Math.random() * 1000),
      draft: ''
    }
  },
    
  async created () {
    this.addNotification('Generating A Keypair For BitPay-Assignment...')

//Start crypto webworker thread
    this.cryptWorker = new Worker('crypto-worker.js')

//Generate keypair and join room
    this.originPublicKey = await this.getWebWorkerResponse('generate-keys')
    this.addNotification(`Keypair Generated For BitPay-Assignment - ${this.getKeySnippet(this.originPublicKey)}`)

//Start socketio again
    this.socket = io()
    this.setupSocketListeners()
  },
    
//Methods to call, hold on to your seatbelts.
  methods: {
      
//Stocket.io event listeners 
    setupSocketListeners () {
        
//Join a room, but it seems to be random for 2nd user, not sure why yet
      this.socket.on('connect', () => {
        this.addNotification('Connected To Server')
        this.joinRoom()
      })

//Tell user that they have lost the socket connection
      this.socket.on('disconnect', () => this.addNotification('Disconnected'))

//Decrypt and display message when received
      this.socket.on('MESSAGE', async (message) => {
          
//Only decrypt messages that were encrypted with the user's public key
        if (message.recipient === this.originPublicKey) {
            
//Decrypt the message
          message.text = await this.getWebWorkerResponse('decrypt', message.text)
          this.messages.push(message)
        }
      })

//When a user joins the current room, send other user's public key
      this.socket.on('NEW_CONNECTION', () => {
        this.addNotification('Another Person Has Joined The Room')
        this.sendPublicKey()
      })

//Share public key when a user joins a room
      this.socket.on('ROOM_JOINED', (newRoom) => {
        this.currentRoom = newRoom
        this.addNotification(`Room Joined - ${this.currentRoom}`)
        this.sendPublicKey()
      })

//Save public key when received
      this.socket.on('PUBLIC_KEY', (key) => {
        this.addNotification(`Public Key Received - ${this.getKeySnippet(key)}`)
        this.destinationPublicKey = key
      })

//Clear public key if other user leaves room
      this.socket.on('user disconnected', () => {
        this.Tell(`User Disconnected - ${this.getKeySnippet(this.destinationKey)}`)
        this.destinationPublicKey = null
      })

//Tell user that the room they are attempting to join is full
      this.socket.on('ROOM_FULL', () => {
        this.addNotification(`Cannot Join ${this.pendingRoom}, Room Is Way Too Full.`)

//Join a random room as a fallback/ Catch all method to make sure a user gets a room
        this.pendingRoom = Math.floor(Math.random() * 1000)
        this.joinRoom()
      })

//Tell room that someone tried to join
      this.socket.on('INTRUSION_ATTEMPT', () => {
        this.addNotification('A 3rd Person Tried To Join')
      })
    },

//Encrypt and show the current draft message 
    async sendMessage () {
        
//If message box has no characters then don't send
      if (!this.draft || this.draft === '') { return }

//Use immutable.js method to avoid unintended side-effects, a recommendation I found for keeping data persisent.
      let message = Immutable.Map({
        text: this.draft,
        recipient: this.destinationPublicKey,
        sender: this.originPublicKey
      })

//Clear the message box once sent
      this.draft = ''

//Add unencrypted message
      this.addMessage(message.toObject())

      if (this.destinationPublicKey) {
          
//Encrypt message with the public key of the other user
        const encryptedText = await this.getWebWorkerResponse(
          'encrypt', [ message.get('text'), this.destinationPublicKey ])
        const encryptedMsg = message.set('text', encryptedText)

//Show the encrypted message
        this.socket.emit('MESSAGE', encryptedMsg.toObject())
      }
    },

//Button event to join the entered chatroom channel number 
    joinRoom () {
      if (this.pendingRoom !== this.currentRoom && this.originPublicKey) {
        this.addNotification(`Trying to Connect To Room - ${this.pendingRoom}...`)

//Reset room variables
        this.messages = []
        this.destinationPublicKey = null

//Share room join request
        this.socket.emit('JOIN', this.pendingRoom)
      }
    },

//Add message to front end
    addMessage (message) {
      this.messages.push(message)
      this.autoscroll(this.$refs.chatContainer)
    },

//Add a notification message to front end 
    addNotification (message) {
      const timestamp = new Date().toLocaleTimeString()
      this.notifications.push({ message, timestamp })
      this.autoscroll(this.$refs.notificationContainer)
    },

//Send message to the worker, and return an arguement that will resolve with the response hopefully
    getWebWorkerResponse (messageType, messagePayload) {
      return new Promise((resolve, reject) => {
          
//Generate a random message id to identify the corresponding event callback
//Trying to recreate a random TCP handshake effect but not really.
        const messageId = Math.floor(Math.random() * 100000)

//Send the message to the webworker
        this.cryptWorker.postMessage([messageType, messageId].concat(messagePayload))

//Create a handler for the webworker message event
        const handler = function (e) {
            
//Only handle messages with the matching message ID
          if (e.data[0] === messageId) {
              
//Remove the event listener once it is called and dealt with to move on
            e.currentTarget.removeEventListener(e.type, handler)

//Deliver the arguement with the message
            resolve(e.data[1])
          }
        }

//Assign the handler to the webworker in the message event
        this.cryptWorker.addEventListener('message', handler)
      })
    },

//Share the public key to all front end users
    sendPublicKey () {
      if (this.originPublicKey) {
        this.socket.emit('PUBLIC_KEY', this.originPublicKey)
      }
    },

//Get key snippet for debugging purposes
    getKeySnippet (key) {
      return key.slice(400, 416)
    },

//Autoscoll DOM element to bottom because its annoying to start at the top
//Perhaps I could flip it, but the world is not ready for that yet.
    autoscroll (element) {
      if (element) { element.scrollTop = element.scrollHeight }
    }
  }
})
