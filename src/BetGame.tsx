import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type { SuiObjectData } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Heading, Text, Box } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";

export function BetGame({ id }: { id: string }) {
  const betGamePackageId = useNetworkVariable("betGamePackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [betAmount, setBetAmount] = useState("1000000000"); // 默认 1 SUI = 10^9 MIST
  const [choice, setChoice] = useState("1");
  const [isLoading, setIsLoading] = useState(false);

  const MIN_BET_AMOUNT = 1_000_000_000; // 1 SUI in MIST

  const validateBet = () => {
    const amount = Number(betAmount);
    if (amount < MIN_BET_AMOUNT) {
      alert("Minimum bet amount is 1 SUI");
      return false;
    }
    return true;
  };

  const { data, isPending, error, refetch } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  const placeBet = async () => {
    if (!validateBet()) return;
    setIsLoading(true);
    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(id),
        tx.splitCoins(tx.gas, [tx.pure.u64(Number(betAmount))]),
        tx.pure.u8(Number(choice)),
      ],
      target: `${betGamePackageId}::game::place_bet`,
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (tx) => {
          suiClient.waitForTransaction({ digest: tx.digest }).then(async () => {
            await refetch();
            setIsLoading(false);
          });
        },
        onError: () => {
          setIsLoading(false);
        },
      },
    );
  };

  if (isPending) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;
  if (!data.data) return <Text>Not found</Text>;

  return (
    <>
      <Heading size="3" mb="4">
        Bet Game {id}
      </Heading>

      <Box mb="4">
        <Flex direction="column" gap="2">
          <Text>
            Total Bets: {formatMist(getGameFields(data.data)?.total_bets ?? 0)}
          </Text>
          <Text>
            Carry Over: {getGameFields(data.data)?.carry_over ?? 0} MIST
          </Text>
          <Text>
            Status: {getGameFields(data.data)?.active ? "Active" : "Settled"}
          </Text>
        </Flex>
      </Box>

      <Flex direction="column" gap="4" style={{ maxWidth: "300px" }}>
        <Box>
          <Text size="2" mb="2" weight="bold">
            Bet Amount (minimum 1 SUI)
          </Text>
          <input
            type="number"
            placeholder="Bet amount (in MIST)"
            value={betAmount}
            min={MIN_BET_AMOUNT}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setBetAmount(e.target.value)
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid var(--gray-a7)",
              outline: "none",
            }}
          />
        </Box>

        <Box>
          <Text size="2" mb="2" weight="bold">
            Choice (1-10)
          </Text>
          <input
            type="number"
            placeholder="Choice (1-10)"
            value={choice}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setChoice(e.target.value)
            }
            min="1"
            max="10"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid var(--gray-a7)",
              outline: "none",
            }}
          />
        </Box>

        <Button onClick={placeBet} disabled={isLoading} size="3">
          {isLoading ? <ClipLoader size={20} /> : "Place Bet"}
        </Button>
      </Flex>
    </>
  );
}

function getGameFields(data: SuiObjectData) {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }

  return data.content.fields as {
    active: boolean;
    total_bets: number;
    carry_over: number;
    owner: string;
  };
}

function formatMist(mist: number): string {
  const sui = mist / 1_000_000_000;
  if (Number.isInteger(sui)) {
    return `${sui} SUI`;
  }
  return `${sui.toFixed(9).replace(/\.?0+$/, "")} SUI`;
}
