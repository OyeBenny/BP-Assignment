//This is required for the jsencrypt library to work in webworker
self.window = self

//Import the jsencrypt library
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/jsencrypt/2.3.1/jsencrypt.min.js');

let crypt = null //Not sure why error shows here, but it works?
let privateKey = null

//Webworker onmessage listener
onmessage = function(e) {
  const [ messageType, messageId, text, key ] = e.data
  let result
  switch (messageType) {
    case 'generate-keys':
      result = generateKeypair()
      break
    case 'encrypt':
      result = encrypt(text, key)
      break
    case 'decrypt':
      result = decrypt(text)
      break
  }

//Return result to the front end
  postMessage([ messageId, result ])
}

//Generate and store keypair
function generateKeypair () {
  crypt = new JSEncrypt({default_key_size: 2056})
  privateKey = crypt.getPrivateKey()

//Only return the public key, keep the private key hidden for obvious reasons
  return crypt.getPublicKey()
}

//Encrypt the given string with the public key 
function encrypt (content, publicKey) {
  crypt.setKey(publicKey)
  return crypt.encrypt(content)
}

//Decrypt the given string with the private key */
function decrypt (content) {
  crypt.setKey(privateKey)
  return crypt.decrypt(content)
}
