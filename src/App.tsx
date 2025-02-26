import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Flex, Heading } from "@radix-ui/themes";
import { BetGame } from "./BetGame";

function App() {
  const currentAccount = useCurrentAccount();
  const betGameId =
    "0xdd26212b40431a52ec4405f30813905fff326c4cb542e39b0411bbc9e7e1a9e1";

  return (
    <>
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
        }}
      >
        <Box>
          <Heading>Bet Game</Heading>
        </Box>
        <Box>
          <ConnectButton />
        </Box>
      </Flex>

      <Flex
        justify="center"
        align="center"
        style={{
          minHeight: "calc(100vh - 60px)",
          flexGrow: 1,
        }}
      >
        {currentAccount ? (
          <Box p="4">
            <BetGame id={betGameId} />
          </Box>
        ) : (
          <Box p="4">
            <Heading>Please connect your wallet</Heading>
          </Box>
        )}
      </Flex>
    </>
  );
}

export default App;
