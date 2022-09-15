// Copyright (c) Apt.ID
// SPDX-License-Identifier: MIT

import keccak256 from "js-sha3";
import { arrayify } from "@ethersproject/bytes";
import * as aptos from "aptos"

export interface NameID {
  hash: string
};

export interface Name {
  expired_at: string,
  name: string,
  parent: NameID,
  transferable: boolean,
  records: { head: [Object], inner: [Object], tail: [Object] }
};

/**
 * AptIDClient work with the main module of AptID protocol: apt_id::apt_id.
 */
export class AptIDClient {
  aptosClient: aptos.AptosClient;
  txBuilder: aptos.TransactionBuilderABI;

  /// address of the Apt.ID module
  aptid_mod_address: string;

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
    this.aptid_mod_address = aptIDModAddr;
  }

  private type_id(pkg: string, id: string) {
    return this.aptid_mod_address + "::" + pkg + "::" + id;
  }

  /**
   * Initialize apt_id::apt_id contract.
   *
   * @param account publisher account of apt_id.
   */
  public async init_aptid(
    account: aptos.AptosAccount,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.type_id("apt_id", "init"),
      [],
      [],
    );
    return this.aptosClient.generateSignSubmitTransaction(account, payload);
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
  async initialize_name_owner_store(
    account: aptos.AptosAccount,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.type_id("apt_id", "initialize_name_owner_store"),
      [],
      [],
    );
    return this.aptosClient.generateSignSubmitTransaction(account, payload);
  }

  async direct_transfer(
    account: aptos.AptosAccount,
    to: aptos.MaybeHexString,
    name: string,
    tld: string,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.type_id("apt_id", "direct_transfer"),
      [],
      [to, name, tld],
    );
    return this.aptosClient.generateSignSubmitTransaction(account, payload);
  }

  /**
   * Returns all names owned by the owner.
   */
  async listNames(ownerAddr: aptos.MaybeHexString): Promise<Name[]> {
    try {
      const makeNameRequest = (hash: string): aptos.Types.TableItemRequest => {
        return {
          key_type: this.type_id("apt_id", "NameID"),
          value_type: this.type_id("apt_id", "Name"),
          key: {
            "hash": hash,
          },
        };
      }
      const nameStore: { type: aptos.Types.MoveStructTag; data: any } = await
        this.aptosClient.getAccountResource(
          ownerAddr,
          this.type_id("apt_id", "NameOwnerStore"),
        );
      const { handle }: { handle: string } = nameStore.data.names;
      const events = await this.aptosClient.getEventsByEventHandle(
        ownerAddr,
        `${this.type_id("apt_id", "NameOwnerStore")}`,
        "deposit_events");
      let names: (Name | null)[] = await Promise.all<Name | null>(
        events.map(async (v) => {
          const hash = v.data.id.hash;
          try {
            return await this.aptosClient.getTableItem(
              handle, makeNameRequest(hash));
          } catch (e) {
            return null;
          }
        }));
      return names.filter((n: Name | null) => {
        return n != null && parseInt(n.expired_at) >= ((+ new Date()) / 1000)
      });
    } catch (e) {
      if (e instanceof aptos.ApiError) {
        return null
      } else {
        console.error("listNames", e)
        throw e;
      }
    }
  }

  /**
   * Returns lable hash
   */
  public static get_label_hash(lable: string): string {
    const hash = keccak256.keccak256(aptos.BCS.bcsSerializeStr(lable).buffer);
    return "0x" + hash;
  }

  /**
   * Returns name_hash of name.tld
   */
  public static get_name_hash(name: string, tld: string) {
    const tld_hash = AptIDClient.get_label_hash(tld);
    const name_lable_hash = AptIDClient.get_label_hash(name);
    const name_hash = keccak256.keccak256(
      new Uint8Array([...arrayify(tld_hash), ...arrayify(name_lable_hash)])
    );
    return "0x" + name_hash;
  }

  public async getOwnerAndName(name: string, tld: string):
    Promise<[string, Name] | null> {
    try {
      const hash = AptIDClient.get_name_hash(name, tld);
      const ownerListStore: { type: aptos.Types.MoveStructTag; data: any } = await
        this.aptosClient.getAccountResource(
          this.aptid_mod_address,
          this.type_id("apt_id", "OwnerListStore"),
        );
      const { handle }: { handle: string } = ownerListStore.data.owners;
      const address = await this.aptosClient.getTableItem(handle, {
        key_type: this.type_id("apt_id", "NameID"),
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

