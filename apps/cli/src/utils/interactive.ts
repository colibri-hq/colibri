import type { MaybePromise } from "@colibri-hq/shared";
import { confirm, input } from "@inquirer/prompts";

export async function promptForInstance() {
  try {
    let url = await input({
      message: "Enter the URL of your Colibri instance:",
      required: true,
      validate(input) {
        if (!input.startsWith("http")) {
          input = `http://${input.replace(/^.*:\/\//, "")}`;
        }

        try {
          const url = new URL(input);

          return Boolean(url);
        } catch {
          return `Invalid instance "${input}". Please provide a valid URL.`;
        }
      },
    });

    if (!url.startsWith("http")) {
      url = `http://${url.replace(/^.*:\/\//, "")}`;
    }

    return new URL("/", url);
  } catch (error) {
    throw new Error("Failed to resolve instance URL.", { cause: error });
  }
}

export async function withConfirmation<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  O extends (...args: any[]) => MaybePromise<any>,
>(
  operation: O,
  prompt: string,
  {
    abortMessage = "Aborted.",
    default: defaultValue = false,
    shortCircuit = false,
  }: {
    abortMessage?: string;
    default?: boolean | string;
    shortCircuit?: boolean;
  } = {},
): Promise<() => Promise<Awaited<ReturnType<O>>>> {
  if (!shortCircuit) {
    const confirmation =
      typeof defaultValue === "string"
        ? await input({
          default: defaultValue,
          message: prompt,
          required: true,
          validate(input) {
            if (input === defaultValue) {
              return true;
            }

            return `Please type "${defaultValue}" to confirm.`;
          },
        })
        : await confirm({
          default: defaultValue,
          message: prompt,
        });

    if (!confirmation) {
      throw new Error(abortMessage, {
        cause: Aborted,
      });
    }
  }

  return async () => operation();
}

export const Aborted = Symbol.for("Aborted");
