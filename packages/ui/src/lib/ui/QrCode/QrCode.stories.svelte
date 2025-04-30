<script module lang="ts">
  import { type Args, defineMeta } from '@storybook/addon-svelte-csf';
  import QrCode from './QrCode.svelte';

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: 'Widgets/QR Code',
    component: QrCode,
    argTypes: {
      // region Data
      value: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      errorCorrectionLevel: {
        control: {
          type: 'radio',
          labels: {
            L: 'Low',
            M: 'Medium',
            Q: 'Quartile',
            H: 'High',
          },
        },
        options: [
          'L',
          'M',
          'Q',
          'H',
        ],
        table: {
          category: 'Data',
        },
      },
      // endregion

      // region Styling
      margin: {
        control: {
          type: 'number',
          min: 0,
        },
        table: {
          category: 'Styling',
        },
      },
      squares: {
        control: {
          type: 'boolean',
        },
        table: {
          category: 'Styling',
        },
        if: {
          arg: 'maskCenter',
          truthy: false,
        },
      },
      maskCenter: {
        control: {
          type: 'boolean',
        },
        table: {
          category: 'Styling',
        },
        if: {
          arg: 'squares',
          truthy: false,
        },
      },
      maskXToYRatio: {
        control: {
          type: 'number',
          min: 0,
          step: 0.1,
          max: 2,
        },
        table: {
          category: 'Styling',
        },
        if: {
          arg: 'maskCenter',
          truthy: true,
        },
      },
      class: {
        control: false,
        table: {
          category: 'Styling',
          disable: true,
        },
      },
      // endregion

      // region Events
      transition: {
        control: 'object',
        table: {
          category: 'Transitions',
        },
      },
      // endregion
    },
    args: {
      value: 'Colibri',
      errorCorrectionLevel: 'Q',
      margin: 0,
      squares: false,
      maskCenter: false,
      maskXToYRatio: 1,
      transition: undefined,
    },
  });
</script>

{#snippet template(args: Args<typeof Story>)}
  <div class="max-w-2xs mx-auto">
    <QrCode {...args} value={args.value ?? ''} />
  </div>
{/snippet}

<Story name="Default" children={template} />
<Story name="Squares" children={template} args={{ squares: true }} />

<Story name="Masked Center" args={{ maskCenter: true }}>
  {#snippet children(args)}
    <div class="max-w-2xs mx-auto">
      <QrCode {...args} value={args.value ?? ''}>
        <span class="text-6xl select-none">📚</span>
      </QrCode>
    </div>
  {/snippet}
</Story>
