import assert from "assert"
import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
export const NODE_URL = process.env.APTOS_NODE_URL;
export const FAUCET_URL = process.env.APTOS_FAUCET_URL;
assert(NODE_URL != undefined)
assert(FAUCET_URL != undefined)

import { AptosClient, AptosAccount, CoinClient, FaucetClient, HexString } from "aptos";
import { AptIDClient, DotAptClient, makeTestnetClients, makeDevnetClients ,AptIDClients, makeLocalClients  } from "../src";
import { devnetConfig } from "../src/config";

// Create API and faucet clients.
const client = new AptosClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);
const modAccount = AptosAccount.fromAptosAccountObject(
  { privateKeyHex: process.env.APTID_MOD_PK as string, });


const faucetDevnet = async() => {
  await faucetClient.fundAccount(devnetConfig.aptidModAddr, 1000_000000);
  await faucetClient.fundAccount(devnetConfig.dotAptTLDModAddr, 1000_000000);
}

const deployInit = async (aptID: AptIDClients) => {
  await faucetClient.fundAccount(modAccount.address(), 1000_000000);
  const hash = await aptID.aptid.initAptID(modAccount);
  await client.waitForTransaction(hash);
  let tx = await client.getTransactionByHash(hash)
  console.log("init apt_id protocol tx: ", tx)

  const hashes = await aptID.dotapt.onboard(modAccount);
  tx = await client.getTransactionByHash(hashes.oneCoin)
  console.log("onboard .apt TLD registrar tx: ", tx)
  tx = await client.getTransactionByHash(hashes.reverse)
  console.log("onboard .reverse TLD registrar tx: ", tx)
}

const register_names = async (aptID: AptIDClients, account: any, names: string[]) => {
  for (const name of names) {
    const hash = await aptID.dotapt.register(account, 1000, name);
    await client.waitForTransaction(hash);
    const tx = await client.getTransactionByHash(hash)
    console.log("name register tx: ", tx)
  }
}

const e2e_script = async (clients: AptIDClients) => {
  const alice = new AptosAccount();
  await faucetClient.fundAccount(alice.address(), 100_000000);
  const bob = new AptosAccount();
  await faucetClient.fundAccount(bob.address(), 100_000000);

  console.log("alice address: ", alice.address());
  console.log("bob address: ", bob.address());

  const short = alice.address().toShortString().slice(0, 7);
  const bobShort = bob.address().toShortString().slice(0, 7);
  const imalice = "Im:" + short;
  const ilovealice = "ILove" + short;
  const forBob = "For" + bobShort;
  await register_names(clients, alice, [imalice, ilovealice, forBob]);
  console.log("name register okay")

  // renew
  await client.waitForTransaction(await clients.dotapt.renew(alice, 1000, ilovealice));
  console.log("renew okay")

  // set reversed record.
  const hash = await clients.dotapt.updateReversedRecord(alice, imalice);
  await client.waitForTransaction(hash);
  const tx = await client.getTransactionByHash(hash)
  console.log("set reversed record tx: ", tx)

  // list all names
  const rst = await clients.aptid.listNames(alice.address());
  const apt_view = clients.dotapt.aptNamesView(rst);
  console.log("alcie names in aptView, ", apt_view);

  // init name store for bob
  await client.waitForTransaction(await clients.aptid.initNameOwnerStore(bob));
  // transfer to a name to bob
  await client.waitForTransaction(await clients.aptid.directTransfer(alice, bob.address(), forBob, "apt"));
  await client.waitForTransaction(await clients.dotapt.updateReversedRecord(bob, forBob));

  // update records
  await client.waitForTransaction(await clients.aptid.upsertRecrod(bob, "apt", forBob, "@", "A", 600, "192.168.0.1"))
  await client.waitForTransaction(await clients.aptid.upsertRecrod(bob, "apt", forBob, "@", "MX", 600, "gmail"))
  await client.waitForTransaction(await clients.aptid.upsertRecrod(bob, "apt", forBob, "@", "Address", 600, bob.address().toShortString()))

  const bob_names = await clients.aptid.listNames(bob.address());
  console.log("bob names", bob_names);
  console.log("forBob name records: ", JSON.stringify(await clients.aptid.getRecords(bob_names[0])));
};

(async () => {
  console.log(NODE_URL);
  console.log(`mod publisher address: ${modAccount.address()}`);
  // // run this once after contract reload
  // const localClients = makeLocalClients(NODE_URL)
  // deployInit(localClients);
  // e2e_script(localClients);

  // await faucetDevnet();
  // const devnetClients = makeDevnetClients(NODE_URL)
  // deployInit(devnetClients);
  // e2e_script(devnetClients);

  await faucetDevnet();
  const clients = makeTestnetClients(NODE_URL)
  deployInit(clients);
  e2e_script(clients);
})();
