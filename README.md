# TypeScript SDk for Apt.ID protocol
NOTE: STILL UNDER DEVELOPOMENT, API BREAKING CHANGES CAN HAPPEN.
This SDK includes two clients that can read and write two major modules:
+ AptIDClient: core name service contract. Functions: name lookup, name transfer,
  records update, and records lookup.
+ DotAptClient: the current active registrar for testing purpose: register or renew
  a name with a fixed pricing: 1000 aptos_coin amount (amount in Move) for 1 day.

## Initialize Clients
## Read
TODO
## Write
TODO

## Install
npm:
```
npm i aptid-ts
```
yarn:
```
yarn install aptid-ts
```

# Example
This is an example of using this SDk to register names on **devnet**, you can run it by `yarn example`.
```
  // register two names, alice-address and love-address,
  const alice_addr = "alice-" + alice.address().toShortString();
  const love_addr = "love-" + alice.address().toShortString();

  // send register transaction for alice_addr
  await client.waitForTransaction(
    await devnetClients.dotapt.register(
      alice, 2, alice_addr));

  // send register transaction for love_addr
  await client.waitForTransaction(
    await devnetClients.dotapt.register(
      alice, 1, love_addr));

  // set reversed record.
  await client.waitForTransaction(await devnetClients.dotapt.updateReversedRecord(alice, alice_addr));

  // list all names registerd, you shall see 3 names, one of them is the reverse record.
  const rst = await devnetClients.aptid.listNames(alice.address())
  console.log(rst)
```
