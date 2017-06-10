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

# API calls

## PUT
```
{
    "tracking_id" : "tracking_id_1",
    "encrypted_proof" : "YmFzZTY0IGRlY29kZXI=",
    "public_proof" : "public unencrypted proof"
}
```

## PATCH
```
{
    "tracking_id" : "tracking_id_4",
    "transfer_to" : "0x9c45e05370b509c416c4e4981c13c6b023b574c0"
}
```