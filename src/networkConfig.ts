import { getFullnodeUrl } from "@mysten/sui/client";
import {
  DEVNET_COUNTER_PACKAGE_ID,
  TESTNET_COUNTER_PACKAGE_ID,
  MAINNET_COUNTER_PACKAGE_ID,
} from "./constants.ts";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        counterPackageId: DEVNET_COUNTER_PACKAGE_ID,
        betGamePackageId:
          "0x94ba4b55545790295ba74bd4296a470ef0dfe6a49fcb29eef5eccb6b9cef661b",
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        counterPackageId: TESTNET_COUNTER_PACKAGE_ID,
        betGamePackageId:
          "0x94ba4b55545790295ba74bd4296a470ef0dfe6a49fcb29eef5eccb6b9cef661b",
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        counterPackageId: MAINNET_COUNTER_PACKAGE_ID,
        betGamePackageId:
          "0x94ba4b55545790295ba74bd4296a470ef0dfe6a49fcb29eef5eccb6b9cef661b",
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
