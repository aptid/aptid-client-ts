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

const register_name_and_list = async (aptID: AptIDClients, names: string[]): Promise<HexString> => {
  const alice = new AptosAccount();
  await faucetClient.fundAccount(alice.address(), 500_000);
  for (let name of names) {
    let hash = await aptID.dotapt.register(alice, 1, name);
    await client.waitForTransaction(hash);
    let tx = await client.getTransactionByHash(hash)
    console.log("name register tx: ", tx)
    const rst = await aptID.aptid.listNames(alice.address())
    console.log(rst)
  }
  return alice.address()
}

// 0x670da70531c2c8f3a8e99a048bdd3cc9b3fe62e7a40ee591c0834865b2a3139f
(async () => {
  console.log(`mod publisher address: ${modAccount.address()}`);
  const localClients = makeClients(client, local_config)
  // await deployInit(localClients);
  // const isOk = await localClients.aptid.isNameAvailable("martin", "apt");
  // console.log(isOk);

  // const alice = new AptosAccount();
  // await faucetClient.fundAccount(alice.address(), 500_000);
  // let hash = await localClients.dotapt.register(alice, 1, "123123");
  // await client.waitForTransaction(hash);
  // let tx = await client.getTransactionByHash(hash)
  // console.log("name register tx: ", tx)

  // hash = await localClients.dotapt.update_reversed_record(alice, "martin");
  // await client.waitForTransaction(hash);
  // tx = await client.getTransactionByHash(hash)
  // console.log("reverse register tx: ", tx)

  // const devnetClients = makeClients(client, devnet_config)
  // await deployInit(devnetClients);
  // let rst = await localClients.aptid.listNames("0x670da70531c2c8f3a8e99a048bdd3cc9b3fe62e7a40ee591c0834865b2a3139f")
  // console.log(rst, JSON.stringify(rst));
  // let acc1 = await register_name_and_list(localClients, ["martin", "filco", "test"]);
  // let acc1 = await register_name_and_list(devnetClients, ["martin", "filco", "test"]);
  // console.log(acc1);
})();
