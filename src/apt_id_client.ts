// Copyright (c) Apt.ID
// SPDX-License-Identifier: MIT

import keccak256 from "js-sha3";
import { arrayify } from "@ethersproject/bytes";
import * as aptos from "aptos";
import { IterableTableClient } from "./iterable_table";
import type { IterableTable } from "./iterable_table";

interface TxExtraArgs {
  maxGasAmount?: aptos.BCS.Uint64;
  gasUnitPrice?: aptos.BCS.Uint64;
  expireTimestamp?: aptos.BCS.Uint64;
}

export type { TxExtraArgs }
interface NameID {
  hash: string
};

interface RecordKey {
  name: String,
  type: String,
}

interface RecordValue {
  ttl: number,
  value: String,
}

interface Name {
  expired_at: string,
  name: string,
  parent: NameID,
  transferable: boolean,
  records: IterableTable<RecordKey, RecordValue>,
};

export type { NameID, Name, RecordKey, RecordValue };

/**
 * AptIDClient work with the main module of AptID protocol: apt_id::apt_id.
 */
export class AptIDClient {
  aptosClient: aptos.AptosClient;
  txBuilder: aptos.TransactionBuilderABI;
  txArgs: TxExtraArgs;

  /// address of the Apt.ID module
  aptidModAddr: string;

  /**
   * Creates new AptID client
   *
   * @param aptosClient AptosClient instance
   * @param abis hex-string array of abis
   * @param aptIDModAddr module address
   */
  constructor(aptosClient: aptos.AptosClient, abis: string[], aptIDModAddr: string) {
    this.aptosClient = aptosClient;
    this.txBuilder = new aptos.TransactionBuilderABI(
      abis.map((abi) => new aptos.HexString(abi).toUint8Array()));
    this.aptidModAddr = aptIDModAddr;
    this.txArgs = {
      maxGasAmount: BigInt(10000),
      gasUnitPrice: BigInt(100),
    };
  }

  private typeName(pkg: string, id: string) {
    return this.aptidModAddr + "::" + pkg + "::" + id;
  }

  public recordKeyTypeName() {
    return this.typeName("apt_id", "RecordKey");
  }

  public recordValueTypeName() {
    return this.typeName("apt_id", "RecordValue");
  }

  public NameIDTypeName() {
    return this.typeName("apt_id", "NameID");
  }

  public NameTypeName() {
    return this.typeName("apt_id", "Name");
  }

  /**
   * Initialize apt_id::apt_id contract.
   *
   * @param account publisher account of apt_id.
   */
  public async initAptID(
    account: aptos.AptosAccount,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.typeName("apt_id", "init"),
      [],
      [],
    );
    return this.aptosClient.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  /**
   * register
   *
   * @param account user account
   * @param amount the amount of aptos coin that the user is willing to pay.
   * @param name  `name.apt` will be renewed.
   *
   * @returns The hash of the transaction submitted to the API
   */
  async initNameOwnerStore(
    account: aptos.AptosAccount,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.typeName("apt_id", "initNameOwnerStore"),
      [],
      [],
    );
    return this.aptosClient.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  async directTransfer(
    account: aptos.AptosAccount,
    to: aptos.MaybeHexString,
    name: string,
    tld: string,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.typeName("apt_id", "direct_transfer"),
      [],
      [to, name, tld],
    );
    return this.aptosClient.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  async upsertRecrod(
    account: aptos.AptosAccount,
    tld: string,
    name: string,
    recordName: string,
    recordType: string,
    ttl: number,
    value: string
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.typeName("apt_id", "upsert_record"),
      [],
      [
        tld,
        name,
        recordName,
        recordType,
        ttl,
        value
      ],
    );
    return this.aptosClient.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  // @returns empty array if the name cannot be found.
  async getRecords(name: Name): Promise<[RecordKey, RecordValue][]> {
    const tb = new IterableTableClient(
      this.aptosClient, this.aptidModAddr, name.records, this.recordKeyTypeName(), this.recordValueTypeName());
    return await tb.items();
  }

  /**
   * Returns all names owned by the owner.
   */
  async listNames(ownerAddr: aptos.MaybeHexString): Promise<Name[]> {
    try {
      const nameStore: { type: aptos.Types.MoveStructTag; data: any } = await
        this.aptosClient.getAccountResource(
          ownerAddr,
          this.typeName("apt_id", "NameOwnerStore"),
        );
      const namesCli = new IterableTableClient<NameID, Name>(
        this.aptosClient, this.aptidModAddr,
        nameStore.data.names, this.NameIDTypeName(), this.NameTypeName());
      const nameItems = await namesCli.items();
      const names: Name[] = nameItems.map((idName) => idName[1]);
      return names;
    } catch (e) {
      if (e instanceof aptos.ApiError) {
        return []
      } else {
        console.error("listNames", e)
        throw e;
      }
    }
  }

  /**
   * Returns lable hash
   */
  public static getLableHash(lable: string): string {
    const hash = keccak256.keccak256(aptos.BCS.bcsSerializeStr(lable).buffer);
    return "0x" + hash;
  }

  /**
   * Returns name_hash of name.tld
   */
  public static getNameHash(name: string, tld: string) {
    const tld_hash = AptIDClient.getLableHash(tld);
    const name_lable_hash = AptIDClient.getLableHash(name);
    const name_hash = keccak256.keccak256(
      new Uint8Array([...arrayify(tld_hash), ...arrayify(name_lable_hash)])
    );
    return "0x" + name_hash;
  }

  public async getOwnerAndName(name: string, tld: string):
    Promise<[string, Name] | null> {
    try {
      const hash = AptIDClient.getNameHash(name, tld);
      const ownerListStore: { type: aptos.Types.MoveStructTag; data: any } = await
        this.aptosClient.getAccountResource(
          this.aptidModAddr,
          this.typeName("apt_id", "OwnerListStore"),
        );
      const { handle }: { handle: string } = ownerListStore.data.owners;
      const address = await this.aptosClient.getTableItem(handle, {
        key_type: this.NameIDTypeName(),
        value_type: "address",
        key: {
          "hash": hash,
        },
      });
      // leverage list names to filter out expired names.
      let names = await this.listNames(address);
      names.filter(n => n.name == hash);
      if (names.length > 0) {
        return [address, names[0]];
      } else {
        return null;
      }
    } catch (e) {
      if (e instanceof aptos.ApiError) {
        return null
      } else {
        console.error("getOwnerAndName", e)
        throw e;
      }
    }
  }

  /**
   * Returns true if the name is available for registration.
   */
  public async isNameAvailable(name: string, tld: string): Promise<boolean> {
    const ownerAndName = await this.getOwnerAndName(name, tld);
    return ownerAndName === null;
  }
}

