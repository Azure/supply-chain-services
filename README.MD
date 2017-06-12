# ibera-services

## update smart contracts

Open the ibera-smart-contracts project and update your contract
run `truffle deploy`
open the built contract in the `build` folder and copy the abi portion into the clipboard
copy it into http://www.textfixer.com/tools/remove-line-breaks.php to remove the line breaks
then set the new string as the value for your abi:
```
const proofAbi = [ { "constant": ... }];
```
run `truffle migrate --reset` to deploy and migrate the contract
copy the address of the deployed contract and set this as the `contractAddress` : 
```
const contractAddress = '0xa6608368fdc4d4db4e802583c16f6f0baa338ef9';
```

you then can create an instance of the contract by using the abi and the address:
```
var contractInstance = web3.eth.contract(proofAbi).at(contractAddress);
```

# Proof API calls

## POST
`POST` creates a measurement for new produce - basically the starting point of the chain. `tracking_id` becomes the resource identifier and only one `POST` per `tracking_id` is a allowed. Or in other words, the initial `POST` is immutable.
```
{
    "tracking_id" : "tracking_id_1",
    "encrypted_proof" : "This content will be encrypted before storing"",
    "public_proof" : {
        "producer_id": "farmer1",
        "email": "test@farmer1.de"
    }
}
```

## PATCH
`PATCH` transfers the ownership to a new account to allow adding additional proofs to the produce. After a succesful `PATCH`, the owner of the `trasnfer_to` account can use the specified `tracking_id` as it's `previous_tracking_id` in a subsequent `PUT`. 
```
{
    "tracking_id" : "tracking_id_1",
    "transfer_to" : "0x9c45e05370b509c416c4e4981c13c6b023b574c0"
}
```

## PUT
`PUT` adds a new proof to the chain, using a new `tracking_id`. `PUT`onyl executes if the "previous_tracking_id" has been transfered to the executing account. 
```
{
    "tracking_id" : "tracking_id_2",
    "previous_tracking_id" : "tracking_id_1",
    "encrypted_proof" : "This content will be encrypted before storing",
    "public_proof" : {
        "producer_id": "farmer2",
        "email": "test@farmer2.de"
    }
}
```
## GET
`GET` retrieves a proof and all it's previous proofs and returns it as an array. The `tracking_id` is encoded in the URL.
After performing the above `POST` a GET on `https://localhost/api/proof?tracking_id=tracking_id_1&decrypt=false` returns the following json: 
```
[
    {
        "tracking_id": "tracking_id_1",
        "owner": "0x422d337a0375a5108c48706901587a80c8dbef7c",
        "encrypted_proof": "Ymoi1sWmG1GRx9CI9QVsh3PKCgqOesH91OADTYydxRkwU2ee9me3wMykVxX2n2AI//uMUqyMmnm1CMbzjS598gk5pZCskhlJ4tMY/ZGXxm7gBZ/3snoNHKuaAxFASMgAdrjH+/WBnaQYsH55wgKc03e+uhBj6yTeXa06aCNFLKQ=",
        "public_proof": {
            "encrypted_proof_hash": "7898fdd63d28c88d461e3d8f6fd3cad5b1140379d3aa6bf0ba2a4664376468db",
            "public_proof": {
                "producer_id": "farmer1",
                "email": "test@farmer1.de"
            }
        },
        "previous_tracking_id": "root"
    }
]
```
while a GET on `https://localhost/api/proof?tracking_id=tracking_id_1&decrypt=true` returns the `encrypted_proof` decrypted. Note: decryption will only take place if the caller has access to the private key. 
```
[
    {
        "tracking_id": "tracking_id_1",
        "owner": "0x422d337a0375a5108c48706901587a80c8dbef7c",
        "encrypted_proof": "This content will be encrypted before storing",
        "public_proof": {
            "encrypted_proof_hash": "7898fdd63d28c88d461e3d8f6fd3cad5b1140379d3aa6bf0ba2a4664376468db",
            "public_proof": {
                "producer_id": "farmer1",
                "email": "test@farmer1.de"
            }
        },
        "previous_tracking_id": "root"
    }
]
```
If we now perform the above `PATCH` and `PUT` operation, a GET on `https://localhost/api/proof?tracking_id=tracking_id_2` returns the following json: 
```
[
[
    {
        "tracking_id": "tracking_id_2",
        "owner": "0x422d337a0375a5108c48706901587a80c8dbef7c",
        "encrypted_proof": "Ymoi1sWmG1GRx9CI9QVsh3PKCgqOesH91OADTYydxRkwU2ee9me3wMykVxX2n2AI//uMUqyMmnm1CMbzjS598gk5pZCskhlJ4tMY/ZGXxm7gBZ/3snoNHKuaAxFASMgAdrjH+/WBnaQYsH55wgKc03e+uhBj6yTeXa06aCNFLKQ=",
        "public_proof": {
            "encrypted_proof_hash": "7898fdd63d28c88d461e3d8f6fd3cad5b1140379d3aa6bf0ba2a4664376468db",
            "public_proof": {
                "producer_id": "farmer2",
                "email": "test@farmer2.de"
            }
        },
        "previous_tracking_id": "tracking_id_1"
    },
    {
        "tracking_id": "tracking_id_1",
        "owner": "0x422d337a0375a5108c48706901587a80c8dbef7c",
        "encrypted_proof": "Ymoi1sWmG1GRx9CI9QVsh3PKCgqOesH91OADTYydxRkwU2ee9me3wMykVxX2n2AI//uMUqyMmnm1CMbzjS598gk5pZCskhlJ4tMY/ZGXxm7gBZ/3snoNHKuaAxFASMgAdrjH+/WBnaQYsH55wgKc03e+uhBj6yTeXa06aCNFLKQ=",
        "public_proof": {
            "encrypted_proof_hash": "7898fdd63d28c88d461e3d8f6fd3cad5b1140379d3aa6bf0ba2a4664376468db",
            "public_proof": {
                "producer_id": "farmer1",
                "email": "test@farmer1.de"
            }
        },
        "previous_tracking_id": "root"
    }
]
]
```

# Key API calls
IMPORTANT: this api needs only to accept calls from autheticated users. The user Id will be used as the `PartitionKey` in the key storage.

## POST
POST creates a new key with the provided `key_id` and returns a `409` if a key with `key_id` already exists.
```
{
    "key_id" : "tracking_id_10"
}
```

## GET
The `tracking_id` is encoded in the URL.
```
https://localhost/api/key?key_id=tracking_id_10
```