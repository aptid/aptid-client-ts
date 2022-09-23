# TypeScript SDk for Apt.ID protocol
```
npm i aptid-ts
```

##
+ `class AptIDClient`: client for apt_id module.
  + `listNames(ownerAddr: aptos.MaybeHexString): Promise<Name[]>`: list all names owned by the address.
  + `getOwnerAndName(name: string, tld: string): Promise<[string, Name] | null>`: return the owner and the name of `name.tld`.
+ `class DotAptClient`: client for misc registrars.
  + `register(account: aptos.AptosAccount, amount: number, name: string): Promise<string>`: register a .apt name.
  + `updateReversedRecord(account: aptos.AptosAccount, aptName: string)`: update reversed record for account to a .apt domain.

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

# Setup
```
yarn install
```

