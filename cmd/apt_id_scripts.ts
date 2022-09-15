import assert from "assert"
import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
export const NODE_URL = process.env.APTOS_NODE_URL || "http://localhost:8080";
export const FAUCET_URL = process.env.APTOS_FAUCET_URL || "http://localhost:8081";
assert(NODE_URL != undefined)
assert(FAUCET_URL != undefined)

import { AptosClient, AptosAccount, CoinClient, FaucetClient, HexString } from "aptos";
import { AptIDClient, DotAptClient } from "../src";
import * as LocalAbis from "../src/abis/local/apt_id_abis";
import * as DevnetAbis from "../src/abis/devnet/apt_id_abis";

interface Config {
  aptid_id: string,
  dot_apt_tld: string,
  abis: string[],
};

const local_addr = "0xf71cb5dc58c4290a2cc009ba5c87f389ca624e1d6b9b9135c2b4c43c1bb69cb6";
const local_config: Config = {
  aptid_id: local_addr,
  dot_apt_tld: local_addr,
  abis: LocalAbis.APT_ID_ABIS,
};

const devnet_config: Config = {
  aptid_id: "0xc7050e4a5fce7292e0e7def652d70e79447fce2d6edb00a1e1fdb3d711978beb",
  dot_apt_tld: "0xfb3e8bc44d50e040c39bb7dc4cef28e93078e7c6bd3db16b05cac2a41ce2b5d8",
  abis: DevnetAbis.APT_ID_ABIS,
};

interface AptIDClients {
  aptid: AptIDClient,
  dotapt: DotAptClient,
}
const makeClients = (aptosClient: AptosClient, config: Config) : AptIDClients => {
  const aptid = new AptIDClient(client, config.abis, config.aptid_id);
  const dotapt = new DotAptClient(client, config.abis, config.dot_apt_tld);
  return { aptid, dotapt }
}

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
  await client.waitForTransaction(await clients.aptid.direct_transfer(alice, bob.address(), forBob, "apt"));

  const bob_names = await clients.aptid.listNames(bob.address());
  console.log(bob_names);
};

(async () => {
  console.log(`mod publisher address: ${modAccount.address()}`);
  const localClients = makeClients(client, local_config)
  // // run this once after contract reload
  // deployInit(localClients);
  e2e_script(localClients);
})();
