import { Web3PluginBase } from 'web3';

import {
  PolkadotSimpleRpcInterfaceFiltered,
  KusamaSimpleRpcInterfaceFiltered,
  SubstrateSimpleRpcInterfaceFiltered,
} from './types/filtered-rpc-types';
import { SubstrateRpcList } from './interfaces/substrate/augment-api-rpc';
import { KusamaRpcList } from './interfaces/kusama/augment-api-rpc';
import { PolkadotRpcList } from './interfaces/polkadot/augment-api-rpc';
import {
  KusamaRpcApiFlatFiltered,
  PolkadotRpcApiFlatFiltered,
  SubstrateRpcApiFlatFiltered,
} from './types/filtered-rpc-types';
import { PolkadotSupportedRpcMethods } from './types/polkadot/supported-rpc-methods';
import { KusamaSupportedRpcMethods } from './types/kusama/supported-rpc-methods';
import { SubstrateSupportedRpcMethods } from './types/substrate/supported-rpc-methods';

// The generic types: PolkadotRpcApiFlattened | KusamaRpcApiFlattened | SubstrateRpcApiFlattened,
// enables having strongly typed variables returned when calling `this.requestManager.send`.
// For example:
// const res = // res will automatically  be of type `Promise<SignedBlock>
//   this.requestManager.send({
//     method: `chain_getBlock`,
//     params: [],
//   });
export class PolkadotPlugin extends Web3PluginBase<
  PolkadotRpcApiFlatFiltered | KusamaRpcApiFlatFiltered | SubstrateRpcApiFlatFiltered
> {
  public pluginNamespace = 'polka';

  /**
   * Dynamically create Rpc callers organized inside namespaces and return them
   * This is equivalent to having a code like this for every endpoint:
   * ```  
      public get chain(): RpcApiSimplified["chain"] {
        return {
          getBlock: (hash?: BlockHash | string | Uint8Array) => {
            return this.requestManager.send({
              method: "chain_getBlock", 
              params: [hash] 
            });
          },
          getBlockHash: (blockNumber?: BlockNumber | AnyNumber | undefined) => {
            return this.requestManager.send({
              method: "chain_getBlockHash", 
              params: [blockNumber] 
            });
          },
          ...
        };
      }
      ...
    * ```
   */
  private createRpcMethods(rpcList: Record<string, readonly string[]>, supported: readonly string[]) {
    const returnedRpcMethods: Record<string, any> = {};
    const objectKeys = Object.keys(rpcList) as Array<keyof typeof rpcList>;
    for (let rpcNamespace of objectKeys) {
      const endpointNames = rpcList[rpcNamespace];
      const endPoints: any = {};
      for (let endpointName of endpointNames) {
        if (!supported.includes(`${rpcNamespace}_${endpointName}`)) {
          continue;
        }
        endPoints[endpointName] = (args: any) =>
          this.requestManager.send({
            method: `${rpcNamespace}_${endpointName}`,
            params: [args],
          });
      }
      returnedRpcMethods[rpcNamespace] = endPoints;
    }
    return returnedRpcMethods;
  }

  // The following commented code contains experiments with using index signature instead of using the method `createRpcMethods`.
  // Left for revisit later...
  // And that would need the constructor to have at the end: `return new Proxy(this, PolkadotPlugin.indexedHandler);`
  // // Index signature to allow indexing the class using a string
  // [rpcNamespace: (string | symbol)]: RpcInterface[RpcApiNamespaces] | any;
  // Or something like: [rpcNamespace: keyof RpcApiSimplified]: PickMethods<typeof rpcNamespace>;
  // Or something like: [rpcNamespace: keyof typeof RpcList]: RpcApiSimplified[typeof rpcNamespace];

  // private static indexedHandler: ProxyHandler<PolkadotPlugin> = {
  //   get(target: PolkadotPlugin,
  //     property: RpcApiNamespaces,
  //     receiver: any) {
  //       if(target[property]){
  //         return target[property]
  //       }

  //       if(property in Object.keys(RpcList)) {
  //         console.log(receiver)
  //         const response = new PolkadotPlugin().requestManager.send({
  //           method: `${property}_${receiver}}`,
  //           params: [receiver]
  //         });
  //         return response;
  //       }

  //     return target[property];
  //   }
  // };

  public polkadot: PolkadotSimpleRpcInterfaceFiltered;
  public kusama: KusamaSimpleRpcInterfaceFiltered;
  public substrate: SubstrateSimpleRpcInterfaceFiltered;

  constructor() {
    super();

    this.polkadot = this.createRpcMethods(
      PolkadotRpcList,
      PolkadotSupportedRpcMethods
    ) as PolkadotSimpleRpcInterfaceFiltered;
    this.kusama = this.createRpcMethods(KusamaRpcList, KusamaSupportedRpcMethods) as KusamaSimpleRpcInterfaceFiltered;
    this.substrate = this.createRpcMethods(
      SubstrateRpcList,
      SubstrateSupportedRpcMethods
    ) as SubstrateSimpleRpcInterfaceFiltered;
  }
}

// Module Augmentation
declare module 'web3' {
  interface Web3Context {
    // This seems a bit hacky. Revisit this in the future and possibly use generics instead.
    polka : PolkadotPlugin
  }
}