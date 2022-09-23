import { AptosClient } from 'aptos';
import { AptIDClient } from './apt_id_client';
import { DotAptClient } from './dot_apt_client';
import * as LocalAbis from './abis/local/apt_id_abis';
import * as DevnetAbis from './abis/devnet/apt_id_abis';

export interface Config {
  aptidModAddr: string;
  dotAptTLDModAddr: string;
  abis: string[];
}

const localAddr = '0xf71cb5dc58c4290a2cc009ba5c87f389ca624e1d6b9b9135c2b4c43c1bb69cb6';
export const localConfig: Config = {
  aptidModAddr: localAddr,
  dotAptTLDModAddr: localAddr,
  abis: LocalAbis.APT_ID_ABIS,
};

export const devnetConfig: Config = {
  aptidModAddr: '0xd6f8440eabd59bfc0ca6dcf7bf864d206e9825e264faf14188af68a72f500bb9',
  dotAptTLDModAddr: '0x8add34212cbe560856ac610865f9bc2e4ac49b65739d58e7f2c87125d73bad02',
  abis: DevnetAbis.APT_ID_ABIS,
};

export const testnetConfig = devnetConfig;

export interface AptIDClients {
  aptid: AptIDClient;
  dotapt: DotAptClient;
}

export const makeClients = (nodeUrl: string, config: Config): AptIDClients => {
  const client = new AptosClient(nodeUrl);
  const aptid = new AptIDClient(client, config.abis, config.aptidModAddr);
  const dotapt = new DotAptClient(client, config.abis, config.dotAptTLDModAddr);
  return { aptid, dotapt };
};

export const makeLocalClients = (nodeUrl: string) => makeClients(nodeUrl, localConfig);
export const makeDevnetClients = (nodeUrl: string) => makeClients(nodeUrl, devnetConfig);
export const makeTestnetClients = (nodeUrl: string) => makeClients(nodeUrl, testnetConfig);
