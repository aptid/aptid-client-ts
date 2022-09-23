import assert from "assert"
import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
export const NODE_URL = process.env.APTOS_NODE_URL;
export const FAUCET_URL = process.env.APTOS_FAUCET_URL;
assert(NODE_URL != undefined)
assert(FAUCET_URL != undefined)

import { AptosClient, AptosAccount, CoinClient, FaucetClient, HexString } from "aptos";
import { AptIDClient, DotAptClient } from "../src";
import { makeClients, AptIDClients, devnet_config, local_config } from "./config";

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
  await client.waitForTransaction(await devnetClients.dotapt.updateReversedRecord(alice, alice_addr));

  // list all names registerd
  const rst = await devnetClients.aptid.listNames(alice.address())
  console.log(rst)

  const shouldBeFalse = await devnetClients.aptid.isNameAvailable(alice_addr, "apt");
  console.log("alice-addr is available: ", shouldBeFalse);

  const shouldBeTrue = await devnetClients.aptid.isNameAvailable("nono-"+alice.address().toShortString(), "apt");
  console.log("nono-addr has not been registered: ", shouldBeTrue);
})();
