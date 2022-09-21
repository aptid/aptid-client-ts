import * as aptos from "aptos"

interface Option<V> {
  vec: V[]
}

const some = <V,>(v: Option<V>): V => {
  if (v.vec.length === 0) {
    throw "option is not initialized";
  }
  return v.vec[0];
}

const isNull = <V,>(v: Option<V>): boolean => {
  return v.vec.length === 0;
}

interface IterableValue<K, V> {
  val: V,
  prev: Option<K>,
  next: Option<K>,
}

interface Table<K, V> {
  handle: string
}

interface TableWithLength<K, V> {
  inner: Table<K, V>,
  length: number
}

interface IterableTable<K, V> {
  inner: TableWithLength<K, IterableValue<K, V>>,
  head: Option<K>,
  tail: Option<K>,
}

export type { Option, IterableValue, IterableTable }
export { some, isNull }

export class IterableTableClient<K, V> {
  cli: aptos.AptosClient;
  modAddr: string;
  tb: IterableTable<K, V>;
  keyTypeName: string;
  valueTypeName: string;

  constructor(aptosClient: aptos.AptosClient, modAddr: string,
    tb: IterableTable<K, V>, keyTypeName: string, valueTypeName: string) {
    this.cli = aptosClient;
    this.modAddr = modAddr;
    this.tb = tb;
    this.keyTypeName = keyTypeName;
    this.valueTypeName = valueTypeName;
  }

  public iterableValueTypeName() {
    return this.modAddr + "::iterable_table::IterableValue<" + this.keyTypeName + "," + this.valueTypeName + ">";
  }

  public async getIterableValue(key: K, ledgerVersion?: BigInt): Promise<IterableValue<K, V> | null> {
    try {
      const v: IterableValue<K, V> = await this.cli.getTableItem(
        this.tb.inner.inner.handle,
        {
          key_type: this.keyTypeName,
          value_type: this.iterableValueTypeName(),
          key: key,
        },
        ledgerVersion ? {
          ledgerVersion: ledgerVersion,
        } : undefined
      );
      return v;
    } catch (e) {
      if (e instanceof aptos.ApiError) {
        return null
      } else {
        console.error("failed to get iterable value", e)
        throw e;
      }

    }
  }

  public async get(key: K, ledgerVersion?: BigInt): Promise<V | null> {
    const v = await this.getIterableValue(key, ledgerVersion);
    if (v == null) {
      return null
    } else {
      return v.val;
    }
  }

  public async items(): Promise<[K, V][]> {
    const version = BigInt((await this.cli.getLedgerInfo()).ledger_version);
    const result: [K, V][] = [];
    let curr = this.tb.head;
    for (let i = 0; i < this.tb.inner.length; i++) {
      const k = some(curr);
      const v = await this.getIterableValue(k, version);
      result.push([k, v.val]);
      curr = v.next;
    }
    return result;
  }
}
