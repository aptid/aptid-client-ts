import { AptosClient } from "aptos";
import * as LocalAbis from "../src/abis/local/apt_id_abis";
import * as DevnetAbis from "../src/abis/devnet/apt_id_abis";
import { AptIDClient, DotAptClient } from "../src";

export interface Config {
  aptid_id: string,
  dot_apt_tld: string,
  abis: string[],
}

const local_addr = "0xf71cb5dc58c4290a2cc009ba5c87f389ca624e1d6b9b9135c2b4c43c1bb69cb6";
export const local_config: Config = {
  aptid_id: local_addr,
  dot_apt_tld: local_addr,
  abis: LocalAbis.APT_ID_ABIS,
};

export const devnet_config: Config = {
  aptid_id: "0xd6f8440eabd59bfc0ca6dcf7bf864d206e9825e264faf14188af68a72f500bb9",
  dot_apt_tld: "0x8add34212cbe560856ac610865f9bc2e4ac49b65739d58e7f2c87125d73bad02",
  abis: DevnetAbis.APT_ID_ABIS,
};

export interface AptIDClients {
  aptid: AptIDClient,
  dotapt: DotAptClient,
}

export const makeClients = (client: AptosClient, config: Config) : AptIDClients => {
  const aptid = new AptIDClient(client, config.abis, config.aptid_id);
  const dotapt = new DotAptClient(client, config.abis, config.dot_apt_tld);
  return { aptid, dotapt }
}
