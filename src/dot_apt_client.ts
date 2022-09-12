// Copyright (c) Apt.ID
// SPDX-License-Identifier: MIT

import * as aptos from "aptos"

export class DotAptClient {
  cli: aptos.AptosClient;
  txBuilder: aptos.TransactionBuilderABI;

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
    this.txBuilder = new aptos.TransactionBuilderABI(
      abis.map((abi) => new aptos.HexString(abi).toUint8Array()));
    this.dot_apt_mod_address = dotAptModAddr;
  }

  private type_id(pkg: string, id: string) {
    return this.dot_apt_mod_address + "::" + pkg + "::" + id;
  }

   /**
   * onboard both one_coin_registrar and the reverse registrar
   *
   * @param aptosClient apt_id::apt_id publisher account.
   */
  public async onboard(account: aptos.AptosAccount) {
    let oneCoin = await this._onboard(account, "one_coin_registrar");
    await this.cli.waitForTransaction(oneCoin);
    let reverse = await this._onboard(account, "reverse_registrar");
    await this.cli.waitForTransaction(reverse);
    return { oneCoin, reverse }
  }

   /**
   * remove both one_coin_registrar and the reverse registrar
   *
   * @param aptosClient apt_id::apt_id publisher account.
   */
  public async resign(account: aptos.AptosAccount) {
    let oneCoin = await this._resign(account, "one_coin_registrar");
    await this.cli.waitForTransaction(oneCoin);
    let reverse = await this._resign(account, "reverse_registrar");
    await this.cli.waitForTransaction(reverse);
    return { oneCoin, reverse }
  }

  private async _onboard(
    account: aptos.AptosAccount,
    mod: string,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.type_id(mod, "onboard"),
      [],
      [],
    );
    return this.cli.generateSignSubmitTransaction(account, payload);
  }

  private async _resign(
    account: aptos.AptosAccount,
    mod: string,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.type_id(mod, "resign"),
      [],
      [],
    );
    return this.cli.generateSignSubmitTransaction(account, payload);
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
  async register(
    account: aptos.AptosAccount,
    amount: number,
    name: string,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.type_id("one_coin_registrar", "register_script"),
      [],
      [amount, name],
    );
    return this.cli.generateSignSubmitTransaction(account, payload);
  }

  /**
   * register
   *
   * @param account user account
   * @param aptName The address.reverse will set its (.apt, TXT) resource record
   * to `aptName.apt`
   *
   * @returns The hash of the transaction submitted to the API
   */
  async update_reversed_record(
    account: aptos.AptosAccount,
    aptName: string,
  ): Promise<string> {
    const payload = this.txBuilder.buildTransactionPayload(
      this.type_id("reverse_registrar", "set_reversed_name_script"),
      [],
      [aptName],
    );
    return this.cli.generateSignSubmitTransaction(account, payload);
  }

}