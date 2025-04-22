<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Controls/Button',
    component: Button,
    argTypes: {
      // region Data
      label: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      href: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      // endregion

      // region Control
      type: {
        control: {
          type: 'radio',
          labels: {
            button: 'Interactive Button',
            submit: 'Form Submit',
          },
        },
        options: ['button', 'submit'],
        table: {
          category: 'Control',
        },
        if: {
          arg: 'href',
          truthy: false,
        },
      },
      disabled: {
        control: 'boolean',
        table: {
          category: 'Control',
        },
      },
      // endregion

      // region Styling
      size: {
        control: {
          type: 'radio',
          labels: {
            small: 'Small',
            medium: 'Medium',
            large: 'Large',
          },
        },
        options: ['small', 'medium', 'large'],
        table: {
          category: 'Styling',
        },
      },
      variant: {
        control: {
          type: 'radio',
          labels: {
            subtle: 'Subtle',
            default: 'Default',
            primary: 'Primary',
            ghost: 'Ghost',
          },
        },
        options: [
          'subtle',
          'default',
          'primary',
          'ghost',
        ],
        table: {
          category: 'Styling',
        },
      },
      icon: {
        control: 'boolean',
        table: {
          category: 'Styling',
        },
      },
      class: {
        control: false,
        table: {
          category: 'Styling',
        },
      },
      // endregion

      // region Events
      onClick: {
        action: 'clicked',
        table: {
          category: 'Events',
        },
      },
      onKeydown: {
        action: 'keyDown',
        table: {
          category: 'Events',
        },
      },
      onKeypress: {
        action: 'keyPress',
        table: {
          category: 'Events',
        },
      },
      onKeyup: {
        action: 'keyUp',
        table: {
          category: 'Events',
        },
      },
      onSubmit: {
        action: 'submit',
        table: {
          category: 'Events',
        },
      },
      // endregion

      // region Slots
      children: {
        control: false,
        table: {
          category: 'Slots',
        },
      },
      // endregion
    },
    args: {
      label: 'Click Me',
      href: undefined,
      type: 'button',
      disabled: false,
      variant: 'default',
      icon: false,
      size: 'medium',
    },
  });
</script>

<Story name="Default" />
