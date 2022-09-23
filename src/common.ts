import * as aptos from 'aptos';
import type { IterableTable } from './iterable_table';

interface TxExtraArgs {
  maxGasAmount?: aptos.BCS.Uint64;
  gasUnitPrice?: aptos.BCS.Uint64;
  expireTimestamp?: aptos.BCS.Uint64;
}

export type { TxExtraArgs };

interface WalletPayloadArgs {
  arguments: any[];
  function: string;
  type?: string;
  type_arguments: string[];
}

export type { WalletPayloadArgs };

interface NameID {
  hash: string;
}

interface RecordKey {
  name: string;
  type: string;
}

interface RecordValue {
  ttl: number;
  value: string;
}

interface Name {
  expired_at: string;
  name: string;
  parent: NameID;
  transferable: boolean;
  records: IterableTable<RecordKey, RecordValue>;
}

export type { NameID, Name, RecordKey, RecordValue };
