// Copyright (c) Apt.ID
// SPDX-License-Identifier: MIT

import keccak256 from 'js-sha3';
import { arrayify } from '@ethersproject/bytes';
import * as aptos from 'aptos';
import { IterableTableClient } from './iterable_table';
import { Name, NameID, RecordKey, RecordValue, TxExtraArgs, WalletPayloadArgs } from './common';

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
    this.txBuilder = new aptos.TransactionBuilderABI(abis.map((abi) => new aptos.HexString(abi).toUint8Array()));
    this.aptidModAddr = aptIDModAddr;
    this.txArgs = {
      maxGasAmount: BigInt(10000),
      gasUnitPrice: BigInt(100),
    };
  }

  private typeName(id: string) {
    return this.aptidModAddr + '::' + 'apt_id' + '::' + id;
  }

  public recordKeyTypeName() {
    return this.typeName('RecordKey');
  }

  public recordValueTypeName() {
    return this.typeName('RecordValue');
  }

  public NameIDTypeName() {
    return this.typeName('NameID');
  }

  public NameTypeName() {
    return this.typeName('Name');
  }

  /**
   * Initialize apt_id::apt_id contract.
   *
   * @param account publisher account of apt_id.
   */
  public async initAptID(account: aptos.AptosAccount): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(this.typeName('init'), [], []);
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
  async initNameOwnerStore(account: aptos.AptosAccount): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(this.typeName('initialize_name_owner_store'), [], []);
    return this.aptosClient.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  public msgInitNameOwnerStore(): WalletPayloadArgs {
    return {
      arguments: [],
      function: this.typeName('initialize_name_owner_store'),
      type: 'entry_function_payload',
      type_arguments: [],
    };
  }

  async directTransfer(
    account: aptos.AptosAccount,
    to: aptos.MaybeHexString,
    name: string,
    tld: string,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(this.typeName('direct_transfer'), [], [to, name, tld]);
    return this.aptosClient.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  public msgDirectTransfer(receiver: aptos.MaybeHexString, name: string, tld: string): WalletPayloadArgs {
    return {
      arguments: [receiver, name, tld],
      function: this.typeName('direct_transfer'),
      type: 'entry_function_payload',
      type_arguments: [],
    };
  }

  async upsertRecrod(
    account: aptos.AptosAccount,
    tld: string,
    name: string,
    recordName: string,
    recordType: string,
    ttl: number,
    value: string,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.typeName('upsert_record'),
      [],
      [tld, name, recordName, recordType, ttl, value],
    );
    return this.aptosClient.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  public msgUpsertRecrod(
    tld: string,
    name: string,
    recordName: string,
    recordType: string,
    value: string,
    ttl: number,
  ): WalletPayloadArgs {
    return {
      arguments: [tld, name, recordName, recordType, ttl, value],
      function: this.typeName('upsert_record'),
      type: 'entry_function_payload',
      type_arguments: [],
    };
  }

  // @returns empty array if the name cannot be found.
  async getRecords(name: Name): Promise<[RecordKey, RecordValue][]> {
    const tb = new IterableTableClient(
      this.aptosClient,
      this.aptidModAddr,
      name.records,
      this.recordKeyTypeName(),
      this.recordValueTypeName(),
    );
    return await tb.items();
  }

  /**
   * Returns all names owned by the owner, including the reversed mapping name.
   */
  async listNames(ownerAddr: aptos.MaybeHexString): Promise<Name[]> {
    try {
      const nameStore: { type: aptos.Types.MoveStructTag; data: any } = await this.aptosClient.getAccountResource(
        ownerAddr,
        this.typeName('NameOwnerStore'),
      );
      const namesCli = new IterableTableClient<NameID, Name>(
        this.aptosClient,
        this.aptidModAddr,
        nameStore.data.names,
        this.NameIDTypeName(),
        this.NameTypeName(),
      );
      const nameItems = await namesCli.items();
      const names: Name[] = nameItems.map((idName) => idName[1]);
      return names;
    } catch (e) {
      if (e instanceof aptos.ApiError) {
        return [];
      } else {
        console.error('listNames', e);
        throw e;
      }
    }
  }

  /**
   * Returns lable hash
   */
  public static getLableHash(lable: string): string {
    const hash = keccak256.keccak256(aptos.BCS.bcsSerializeStr(lable).buffer);
    return '0x' + hash;
  }

  /**
   * Returns name_hash of name.tld
   */
  public static getNameHash(name: string, tld: string) {
    const tld_hash = AptIDClient.getLableHash(tld);
    const name_lable_hash = AptIDClient.getLableHash(name);
    const name_hash = keccak256.keccak256(new Uint8Array([...arrayify(tld_hash), ...arrayify(name_lable_hash)]));
    return '0x' + name_hash;
  }

  public async getOwnerAndName(name: string, tld: string): Promise<[string, Name] | null> {
    try {
      const hash = AptIDClient.getNameHash(name, tld);
      const ownerListStore: { type: aptos.Types.MoveStructTag; data: any } = await this.aptosClient.getAccountResource(
        this.aptidModAddr,
        this.typeName('OwnerListStore'),
      );
      const { handle }: { handle: string } = ownerListStore.data.owners;
      const address = await this.aptosClient.getTableItem(handle, {
        key_type: this.NameIDTypeName(),
        value_type: 'address',
        key: {
          hash: hash,
        },
      });
      // leverage list names to filter out expired names.
      const names = await this.listNames(address);
      names.filter((n) => n.name == hash);
      if (names.length > 0) {
        return [address, names[0]];
      } else {
        return null;
      }
    } catch (e) {
      if (e instanceof aptos.ApiError) {
        return null;
      } else {
        console.error('getOwnerAndName', e);
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
