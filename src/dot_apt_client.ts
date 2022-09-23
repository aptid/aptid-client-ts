// Copyright (c) Apt.ID
// SPDX-License-Identifier: MIT

import * as aptos from 'aptos';

import { AptIDClient } from './apt_id_client';
import type { Name, TxExtraArgs, WalletPayloadArgs } from './common';

const unitPrice = 1000;

interface DotAptView {
  apt_names: Name[];
  reversed: Name | null;
}

export type { DotAptView };

export class DotAptClient {
  cli: aptos.AptosClient;
  txBuilder: aptos.TransactionBuilderABI;
  txArgs: TxExtraArgs;

  // address of the dot_apt module
  dot_apt_mod_address: string;

  /**
   * Creates new AptID client
   *
   * @param aptosClient AptosClient instance
   * @param dotAptModAddr module address
   */
  constructor(aptosClient: aptos.AptosClient, abis: string[], dotAptModAddr: string) {
    this.cli = aptosClient;
    this.txBuilder = new aptos.TransactionBuilderABI(abis.map((abi) => new aptos.HexString(abi).toUint8Array()));
    this.dot_apt_mod_address = dotAptModAddr;
    this.txArgs = {
      maxGasAmount: BigInt(10000),
      gasUnitPrice: BigInt(100),
    };
  }

  private typeID(pkg: string, id: string) {
    return this.dot_apt_mod_address + '::' + pkg + '::' + id;
  }

  /**
   * onboard both one_coin_registrar and the reverse registrar
   *
   * @param aptosClient apt_id::apt_id publisher account.
   */
  public async onboard(account: aptos.AptosAccount) {
    const oneCoin = await this._onboard(account, 'one_coin_registrar');
    await this.cli.waitForTransaction(oneCoin);
    const reverse = await this._onboard(account, 'reverse_registrar');
    await this.cli.waitForTransaction(reverse);
    return { oneCoin, reverse };
  }

  /**
   * remove both one_coin_registrar and the reverse registrar
   *
   * @param aptosClient apt_id::apt_id publisher account.
   */
  public async resign(account: aptos.AptosAccount) {
    const oneCoin = await this._resign(account, 'one_coin_registrar');
    await this.cli.waitForTransaction(oneCoin);
    const reverse = await this._resign(account, 'reverse_registrar');
    await this.cli.waitForTransaction(reverse);
    return { oneCoin, reverse };
  }

  private async _onboard(account: aptos.AptosAccount, mod: string): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(this.typeID(mod, 'onboard'), [], []);
    return this.cli.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  private async _resign(account: aptos.AptosAccount, mod: string): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(this.typeID(mod, 'resign'), [], []);
    return this.cli.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  /**
   * register
   *
   * @param account user account
   * @param amount the amount of aptos coin that the user is willing to pay.
   * @param name  `name.apt` will be registered.
   *
   * @returns The hash of the transaction submitted to the API
   */
  async register(account: aptos.AptosAccount, amount: number, name: string): Promise<string> {
    if (amount < unitPrice) {
      throw 'amount too little';
    }
    const payload = this.txBuilder.buildTransactionPayload(
      this.typeID('one_coin_registrar', 'register_script'),
      [],
      [amount, name],
    );
    return this.cli.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  public msgRegister(coin: number, name: string): WalletPayloadArgs {
    return {
      arguments: [coin, name],
      function: this.typeID('one_coin_registrar', 'register_script'),
      type: 'entry_function_payload',
      type_arguments: [],
    };
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
  async renew(account: aptos.AptosAccount, amount: number, name: string): Promise<string> {
    if (amount < unitPrice) {
      throw 'amount too little';
    }
    const payload = this.txBuilder.buildTransactionPayload(
      this.typeID('one_coin_registrar', 'renew_script'),
      [],
      [amount, name],
    );
    return this.cli.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  public msgRenew(coin: number, name: string): WalletPayloadArgs {
    return {
      arguments: [coin, name],
      function: this.typeID('one_coin_registrar', 'renew_script'),
      type: 'entry_function_payload',
      type_arguments: [],
    };
  }

  /**
   * updateReversedRecord
   *
   * @param account user account
   * @param aptName The address.reverse will set its (.apt, TXT) resource record
   * to `aptName.apt`
   *
   * @returns The hash of the transaction submitted to the API
   */
  async updateReversedRecord(account: aptos.AptosAccount, aptName: string): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.typeID('reverse_registrar', 'set_reversed_name_script'),
      [],
      [aptName],
    );
    return this.cli.generateSignSubmitTransaction(account, payload, this.txArgs);
  }

  public msgUpdateReversedRecord(aptName: string): WalletPayloadArgs {
    return {
      arguments: [aptName],
      function: this.typeID('reverse_registrar', 'set_reversed_name_script'),
      type: 'entry_function_payload',
      type_arguments: [],
    };
  }

  public aptNamesView(names: Name[]): DotAptView {
    if (!names) {
      return {
        apt_names: [],
        reversed: null,
      };
    }
    const apt_names = names.filter((n: Name) => {
      return n.parent.hash === AptIDClient.getLableHash('apt');
    });
    const reversed_names = names.filter((n: Name) => {
      return n.parent.hash === AptIDClient.getLableHash('reverse');
    });
    const reversed_name = reversed_names.length > 0 ? reversed_names[0] : null;
    // TODO: check if reversed name matches the primary address
    // if (reversed_name) {
    //   // reversed record does not match name.
    //   if (!apt_names.some((n: Name) => {
    //     // return n.name == reversed_name.records[[".apt", "TXT"];
    //     return true;
    //   })) {
    //     reversed_name = null;
    //   }
    // }
    return {
      apt_names: apt_names,
      reversed: reversed_name,
    };
  }
}
