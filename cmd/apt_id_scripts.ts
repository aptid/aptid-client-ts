import assert from "assert"
import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
export const NODE_URL = process.env.APTOS_NODE_URL;
export const FAUCET_URL = process.env.APTOS_FAUCET_URL;
assert(NODE_URL != undefined)
assert(FAUCET_URL != undefined)

import { AptosClient, AptosAccount, CoinClient, FaucetClient, HexString } from "aptos";
import { AptIDClient, DotAptClient, IterableTableClient } from "../src";
import { makeClients, AptIDClients, devnet_config, local_config } from "./config";

// Create API and faucet clients.
const client = new AptosClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);
const modAccount = AptosAccount.fromAptosAccountObject(
  { privateKeyHex: process.env.APTID_MOD_PK as string, });

const deployInit = async (aptID: AptIDClients) => {
  let hash = await aptID.aptid.init_aptid(modAccount);
  await client.waitForTransaction(hash);
  let tx = await client.getTransactionByHash(hash)
  console.log("init apt_id protocol tx: ", tx)

  let hashes = await aptID.dotapt.onboard(modAccount);
  tx = await client.getTransactionByHash(hashes.oneCoin)
  console.log("onboard .apt TLD registrar tx: ", tx)
  tx = await client.getTransactionByHash(hashes.reverse)
  console.log("onboard .reverse TLD registrar tx: ", tx)
}

const register_names = async (aptID: AptIDClients, account: any, names: string[]) => {
  for (let name of names) {
    let hash = await aptID.dotapt.register(account, 1, name);
    await client.waitForTransaction(hash);
    let tx = await client.getTransactionByHash(hash)
    console.log("name register tx: ", tx)
  }
}

const e2e_script = async (clients: AptIDClients) => {
  const alice = new AptosAccount();
  await faucetClient.fundAccount(alice.address(), 500_000);
  const bob = new AptosAccount();
  await faucetClient.fundAccount(bob.address(), 500_000);

  console.log("alice address: ", alice.address());
  console.log("bob address: ", bob.address());

  const short = alice.address().toShortString().slice(0, 7);
  const bobShort = bob.address().toShortString().slice(0, 7);
  const imalice = "Im:" + short;
  const ilovealice = "ILove" + short;
  const forBob = "For" + bobShort;
  await register_names(clients, alice, [imalice, ilovealice, forBob]);

  // renew
  await client.waitForTransaction(await clients.dotapt.renew(alice, 1, ilovealice));

  // set reversed record.
  await client.waitForTransaction(await clients.dotapt.update_reversed_record(alice, imalice));

  // list all names
  const rst = await clients.aptid.listNames(alice.address());
  const apt_view = clients.dotapt.apt_names_view(rst);
  console.log(apt_view);

  // init name store for bob
  await client.waitForTransaction(await clients.aptid.initialize_name_owner_store(bob));
  // transfer to a name to bob
  await client.waitForTransaction(await clients.aptid.direct_transfer(alice, bob.address(), forBob, "apt"));
  await client.waitForTransaction(await clients.dotapt.update_reversed_record(bob, forBob));

  // update records
  await client.waitForTransaction(await clients.aptid.upsert_record(bob, forBob, "apt", "@", "A", 600, "192.168.0.1"))
  await client.waitForTransaction(await clients.aptid.upsert_record(bob, forBob, "apt", "@", "MX", 600, "gmail"))
  await client.waitForTransaction(await clients.aptid.upsert_record(bob, forBob, "apt", "@", "Address", 600, bob.address().toShortString()))

  const bob_names = await clients.aptid.listNames(bob.address());
  console.log(JSON.stringify(bob_names, null, 2));
  console.log(JSON.stringify(await clients.aptid.getRecords(bob_names[0])));
};

(async () => {
  console.log(NODE_URL);
  console.log(`mod publisher address: ${modAccount.address()}`);
  // // run this once after contract reload
  const localClients = makeClients(client, local_config)
  deployInit(localClients);
  e2e_script(localClients);

  // .... Aptos typescript SDK has a bug that if the account address
  // has leading zeros, it will fail to find the corresponding function.
  // const devnetClients = makeClients(client, devnet_config)
  // deployInit(devnetClients);
  // e2e_script(devnetClients);

})();
