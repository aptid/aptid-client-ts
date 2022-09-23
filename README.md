# TypeScript SDk for Apt.ID protocol
NOTE: STILL UNDER DEVELOPOMENT, API BREAKING CHANGES CAN HAPPEN.

This SDK includes two clients that can read and write two major modules:
+ AptIDClient: core name service contract for name lookup, name transfer,
  records update, and records lookup.
+ DotAptClient: the current active registrar for testing purpose: register or renew
  a name with a fixed pricing: 1000 aptos_coin amount (amount in Move) for 1 day.
## Install
npm:
```
npm i aptid-ts
```
yarn:
```
yarn add aptid-ts
```
## Initialize Clients
We have provide helper functions for creating both clients based on the enviroment.
```
// Initialize a client to check if "yourname.apt" is available on devnet.
import { makeDevnetClients } from "aptid-ts";

const NODE_URL = "https://fullnode.devnet.aptoslabs.com/v1";
const clients  = makeDevnetClients(NODE_URL);
console.log(await clients.aptid.isNameAvailable("yourname", "apt"));

// For testnet
import { makeTestnetClients } from "aptid-ts";

const NODE_URL = "https://testnet.aptoslabs.com/v1";
const clients  = makeTestnetClients(NODE_URL);
// .....
```

## Read
APIs of reading state of the contracts are the same for both server-side and browser-side.
### isNameAvailable
```
  const makeAptIDClients = () => makeDevnetClients(NODE_URL);
  return await clients.aptid.isNameAvailable(name, tld);
```
### get a '.apt' name
```
const getAptName = async (
  name: string
): Promise<[string, Name] | null> => {
  const clients = makeAptIDClients();
  return await clients.aptid.getOwnerAndName(name, "apt");
};
```

### list names of an address
We provide a helper function `clients.dotapt.aptNamesView` to separate out the reversed mapping name.
```
export const getMineNamesAptView = async (address: string) => {
  const clients = makeAptIDClients();
  const allNames = await clients.aptid.listNames(address);
  const aptNameView = clients.dotapt.aptNamesView(allNames);
  return aptNameView;
};
```

Example outut:
```
{
  apt_names: [
    {
      expired_at: '1664061409',
      name: 'Im:0xc62df',
      parent: [Object],
      records: [Object],
      transferable: true
    },
    {
      expired_at: '1664147811',
      name: 'ILove0xc62df',
      parent: [Object],
      records: [Object],
      transferable: true
    },
    {
      expired_at: '1664061412',
      name: 'For0xf859f',
      parent: [Object],
      records: [Object],
      transferable: true
    }
  ],
  reversed: {
    expired_at: '33199975015',
    name: 'C62DF88CA51461EF5DF0D3133E67E8EE35B27F4F05EAFF4E4208F9BCEB816929',
    parent: {
      hash: '0x02c65fe745c08533381eb9e066593f46714b88d01065c7f3d1a5cf7b05abe410'
    },
    records: { head: [Object], inner: [Object], tail: [Object] },
    transferable: false
  }
}
```

### list records of a name
```
  const clients = makeAptIDClients();
  return await clients.aptid.getRecords(name);
```

Example output:
```
[[{"name":"@","type":"A"},{"ttl":"600","value":"192.168.0.1"}],[{"name":"@","type":"MX"},{"ttl":"600","value":"gmail"}],[{"name":"@","type":"Address"},{"ttl":"600","value":"0xf859f4ec08481a1a98c2b25706d51fe847bf30363206cc4af435c4a959fda710"}]]
```

## Write
We provide both server-side functions that can sign and submit the transaction
with signer account as the first argument, and browser-side functions (msg*) that
build the transaction payload.
### Browser side
On the browser side, you will build the payload of the transaction and send it
to wallet extensions to sign and submit.
#### Register a name
```
  const clients = makeAptIDClients();
  const txPayload = clients.dotapt.msgRegister(amount, name);
  const pendingTransaction = await (
    window as any
  ).aptos.signAndSubmitTransaction(txPayload);
  return pendingTransaction;
```
#### Update primary address
```
  const clients = makeAptIDClients();
  const txPayload = clients.dotapt.msgUpdateReversedRecord(name);
  const pendingTransaction = await (
    window as any
  ).aptos.signAndSubmitTransaction(txPayload);
  return pendingTransaction;
```

#### Transfer name
```
export const transfer = async (receiver: string, name: string) => {
  console.log("transfer ", name, " to ", receiver);
  const clients = makeAptIDClients();
  const txPayload = clients.aptid.msgDirectTransfer(receiver, name, "apt");
  try {
    const pendingTransaction = await (
      window as any
    ).aptos.signAndSubmitTransaction(txPayload);
    return pendingTransaction;
  } catch (error) {
    console.log("transfer error", error);
    throw error;
  }
};

```
### Server side
On the server side, you can directly send the transaction via clients.
```
  const devnetClients = makeDevnetClients(NODE_URL);
  const alice = new AptosAccount();
  await faucetClient.fundAccount(alice.address(), 500_000);

  // register two names, alice-address and love-address,
  console.log("Prepare to register names for :", alice.address().toShortString());
  const alice_addr = "alice-" + alice.address().toShortString();
  const love_addr = "love-" + alice.address().toShortString();
  await client.waitForTransaction(
    await devnetClients.dotapt.register(
      alice, 2, alice_addr));
  await client.waitForTransaction(
    await devnetClients.dotapt.register(
      alice, 1, love_addr));

  // set reversed record.
  await client.waitForTransaction(await devnetClients.dotapt.updateReversedRecord(alice, alice_addr));

```
