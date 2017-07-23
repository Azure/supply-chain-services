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
copy the address of the deployed contract and set this as an environment variable `deployed_contract_address` either in your local `config.json` or as an AppSetting in the WebApp environment: 
```
"deployed_contract_address" : "0xa6608368fdc4d4db4e802583c16f6f0baa338ef9";
```

you then can create an instance of the contract by using the abi and the address:
```
const contractAddress = nconf.get('deployed_contract_address');
var contractInstance = web3.eth.contract(proofAbi).at(contractAddress);
```
## Specify the Ethereum address
In addition to deploying the contract, you also need to create an Ethereum account and link this to the service through the environment setting called `account_address` such as here in the local `config.json`:

```
   "account_address" : "0x79178125ba23619951847a7149c6e0e0f1804baf"
```

# Proof API calls

## PUT
`PUT` creates a measurement for new produce - basically the starting point of the chain. `tracking_id` becomes the resource identifier and only one `PUT` per `tracking_id` is a allowed. Or in other words, the initial `PUT` is immutable.

The following request adds a new proof to the chain:

```json
{
  "tracking_id" : "tracking_id_1",
  "encrypted_proof": {
    "proof": "This content will be encrypted before storing"
  },
  "public_proof" : {
    "producer_id": "farmer1",
    "email": "test@farmer1.de"
  }
}
```

In order to create a proof that is chained to a previous already-existing proof, add the `previous_tracking_id` field.
**Note**: This will only work if the `previous_tracking_id` proof is owned by the calling account, or if it has been transfered to the executing account using the `PATCH` method as demonstrated below.

The following request adds a new proof that is chained to the previous one:

```json
{
  "tracking_id" : "tracking_id_2",
  "previous_tracking_id": "tracking_id_1",
  "encrypted_proof": {
    "proof": "This content will be encrypted before storing"
  },
  "public_proof" : {
    "producer_id": "farmer1",
    "email": "test@farmer1.de"
  }
}
```


## PATCH
`PATCH` transfers the ownership to a new account to allow adding additional proofs to the produce. After a succesful `PATCH`, the owner of the `trasnfer_to` account can use the specified `tracking_id` as it's `previous_tracking_id` in a subsequent `PUT`. 

```json
{
  "tracking_id" : "tracking_id_1",
  "transfer_to" : "0x9c45e05370b509c416c4e4981c13c6b023b574c0"
}
```


## GET
`GET` retrieves a proof and all it's previous proofs and returns it as an array. The `tracking_id` should be provided as part of the URL parameters.
After performing the above `PUT` a `GET` on `/api/proof/tracking_id_1?decrypt=0` returns the following json: 

```json
[
  {
    "tracking_id": "tracking_id_1",
    "owner": "0x422d337a0375a5108c48706901587a80c8dbef7c",
    "encrypted_proof": "RolsKpMso+ZnOHq4YeaQ3chH1aWfng8GPMsw/HdhE5PLyrb4RtgHONWuLqO+ZSBz0cUm5bTzUXLvlrWk4Um7XyBvKccDv9/dEAP3pIO+G9w70qtxKbpeZpdEnR2kAbatuOD5rrFUI4fNJj7NoUncY59o7ppMX3xfDp7U7n9GzAo4Z0667EKw3YNM4gParDKYpuhXcupjN7Xr77SAMpkRF29lxrS23EhXpQ368aUzgdZP5A0YBidI1Ah48sjdroXh",
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

A `GET` on `/api/proof/tracking_id_1?decrypt=1` returns the `encrypted_proof` decrypted. 
**Note**: Decryption will only take place if the caller has access to the private key. 

```json
[
  {
    "tracking_id": "tracking_id_1",
    "owner": "0x422d337a0375a5108c48706901587a80c8dbef7c",
    "encrypted_proof": {
      "value": "This content will be encrypted before storing"
    },
    "public_proof": {
      "encrypted_proof_hash": "ef4089c73b92e128ac68ebc2e26f6893eec5f1ab4607de2752c73e2a143a1375",
      "public_proof": {
        "producer_id": "farmer1",
        "email": "test@farmer1.de"
      }
    },
    "previous_tracking_id": "root"
  }
]
```

If we now perform the above `PATCH` and `PUT` operations, a GET on `/api/proof/tracking_id_2` will return the following json: 

```json
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
```

# Key API calls
**IMPORTANT**: This api needs only to accept calls from autheticated users. The user Id will be used as the `PartitionKey` in the key storage.

## PUT
PUT creates a new key with the provided `key_id` and returns the HTTP status code `409` if a key with `key_id` already exists.

```json
{
  "key_id" : "tracking_id_1"
}
```

## GET
The `key_id` provided as part of the URL parameters. The api only returns the public but never the private key.
A call to `/api/key?key_id=tracking_id_1` returns 

```json
{
  "key_id": "tracking_id_1",
  "public_key": "-----BEGIN RSA PUBLIC KEY-----\nMEgCQQDaeW3dIGRrE1ZBwWyFNJc7iZPvSTNXHN5LIbHCAOCwp/W+Fy7PLaKyS4JT\nVhjV1/AmRmwnbeUI9/HZEVGaF573AgMBAAE=\n-----END RSA PUBLIC KEY-----"
}
```
