import { BaseCommand } from "../command.ts";

export default class Login extends BaseCommand<typeof Login> {
  static description = "Login to your Colibri instance.";
  static examples = [
    "<%= config.bin %> <%= command.id %>",
    {
      command: "<%= config.bin %> <%= command.id %> --instance https://colibri.example.com",
      description:
        "To connect to a specific Colibri instance, use the --instance option:",
    },
  ];

  async run() {
    this.logToStderr(`Logging in to instance "${this.instance.url}"`);
  }
}
