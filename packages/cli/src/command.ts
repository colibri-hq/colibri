import { config } from '$cli/flags/config.js';
import { instance } from '$cli/flags/instance.js';
import { Command, Flags, Interfaces } from '@oclif/core';

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<T['flags'] & typeof BaseCommand['baseFlags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static baseFlags = {
    config: config({
      helpGroup: 'GLOBAL',
    }),
    instance: instance({
      helpGroup: 'GLOBAL',
      relationships: [
        {
          flags: ['config'],
          type: 'all',
        },
      ],
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Show verbose output.',
      helpGroup: 'GLOBAL',
    }),
  };
  static enableJsonFlag = true;
  protected args!: Args<T>;
  protected flags!: Flags<T>;

  protected async catch(err: Error & { exitCode?: number }) {
    return super.catch(err);
  }

  protected async finally(_: Error | undefined) {
    await this.flags?.instance?.destroy();

    return super.finally(_);
  }

  public async init() {
    await super.init();

    const { args, flags } = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    });

    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;
  }
}
