import { AptosClient, AptosAccount, FaucetClient, HexString } from "aptos";
import { AptIDClient, DotAptClient } from "../src";
import * as DevnetAbis from "../src/abis/devnet/apt_id_abis";

const NODE_URL = "https://fullnode.devnet.aptoslabs.com/v1";
const FAUCET_URL = "https://faucet.devnet.aptoslabs.com"

interface Config {
  aptid_id: string,
  dot_apt_tld: string,
  abis: string[],
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
const makeClients = (aptosClient: AptosClient, config: Config): AptIDClients => {
  const aptid = new AptIDClient(client, config.abis, config.aptid_id);
  const dotapt = new DotAptClient(client, config.abis, config.dot_apt_tld);
  return { aptid, dotapt }
}

// Create API and faucet clients.
const client = new AptosClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

(async () => {
  const devnetClients = makeClients(client, devnet_config)
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
  await client.waitForTransaction(await devnetClients.dotapt.update_reversed_record(alice, alice_addr));

  // list all names registerd
  const rst = await devnetClients.aptid.listNames(alice.address())
  console.log(rst)
})();
