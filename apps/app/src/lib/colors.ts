export type Color<
  R extends number = number,
  G extends number = number,
  B extends number = number,
  A extends number = number,
> = [R, G, B, A];
export type RgbCssColor<C extends Color = Color> =
  | `rgb(${C[0]},${C[1]},${C[2]})`
  | `rgb(${C[0]}, ${C[1]}, ${C[2]})`;
export type RgbaCssColor<C extends Color = Color, A extends number = number> =
  | `rgba(${C[0]},${C[1]},${C[2]},${A})`
  | `rgba(${C[0]}, ${C[1]}, ${C[2]}, ${A})`;
export type CssColor<
  C extends Color = Color,
  A extends number | undefined = undefined,
> = A extends number ? RgbaCssColor<C, A> : RgbCssColor<C>;

function hashCode(input: string) {
  let hash = 0;

  if (input.length == 0) {
    return hash;
  }

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;

    // Convert to 32bit integer
    // hash = hash | hash;
  }

  return hash;
}

export function generateColorFromString(
  input: string,
  minLightness: number = 30,
  maxLightness: number = 70,
) {
  const hash = hashCode(input);

  // Convert hash to RGB values
  const r = (hash & 0xff_00_00) >> 16;
  const g = (hash & 0x00_ff_00) >> 8;
  const b = hash & 0x00_00_ff;

  // Convert RGB to HSL
  const [h, s, l] = rgbToHsl([r / 255, g / 255, b / 255, 1]);

  // Adjust lightness within the specified range
  const l2 = Math.min(maxLightness, Math.max(minLightness, l * 100));

  return hslToRgb(h, s, l2);
}

export function rgbToCssColor<
  R extends number,
  G extends number,
  B extends number,
  C extends Color<R, G, B>,
>([r, g, b]: C, a?: number): CssColor<C, typeof a> {
  return typeof a !== "undefined"
    ? `rgba(${r}, ${g}, ${b}, ${a})`
    : `rgb(${r}, ${g}, ${b})`;
}

export function parseCssColor(color: string) {
  if (color.startsWith("#")) {
    let hex = color.replace(/^#/, "");

    if (hex.length === 3) {
      hex = hex.replace(/(.)/g, "$1$1");
    }

    if (!/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$/.test(hex)) {
      throw new Error("Invalid hex color format");
    }

    // Convert the hex value to decimal
    const [r, g, b, a = 1] = hex
      .match(/[A-Fa-f0-9]{2}/g)!
      .map((value) => parseInt(value, 16));

    return [r, g, b, a] satisfies Color;
  }

  const result = color.match(
    /^rgba?\((?<r>\d+),\s*(?<g>\d+),\s*(?<b>\d+)(?:,\s*(?<a>(\d+|\d\.\d+)))?\)$/,
  );

  if (!result) {
    throw new Error("Invalid rgb color format");
  }

  const { r, g, b, a } = result.groups!;

  return [+r, +g, +b, +a] satisfies Color;
}

function rgbToHsl([r, g, b]: Color) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h: number;
  let s: number;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic

    return [h, s, l] as const;
  }

  const d = max - min;
  s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;

    case g:
      h = (b - r) / d + 2;
      break;

    case b:
      h = (r - g) / d + 4;
      break;

    default:
      h = 0;
  }

  h /= 6;

  return [h, s, l] as const;
}

function hslToRgb(h: number, s: number, l: number) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) {
        t += 1;
      }

      if (t > 1) {
        t -= 1;
      }

      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }

      if (t < 1 / 2) {
        return q;
      }

      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }

      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hueToRgb(p, q, h + 1 / 3) * 255;
    g = hueToRgb(p, q, h) * 255;
    b = hueToRgb(p, q, h - 1 / 3) * 255;
  }

  return [Math.round(r) / 100, Math.round(g) / 100, Math.round(b) / 100];
}

export function rgbToHex([r, g, b]: Color) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function deriveLuminance(color: Color) {
  const [red, green, blue] = color.map((v) => {
    v /= 255;

    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function deriveContrast(color1: Color, color2: Color) {
  const luminance1 = deriveLuminance(color1);
  const luminance2 = deriveLuminance(color2);

  return luminance2 < luminance1
    ? (luminance2 + 0.1) / (luminance1 + 0.1)
    : (luminance1 + 0.1) / (luminance2 + 0.1);
}

export function contrastingColor<Light extends Color, Dark extends Color>(
  color: Color,
  lightColor: Light = [255, 255, 255, 1] as Light,
  darkColor: Dark = [0, 0, 0, 1] as Dark,
) {
  return deriveContrast(color, lightColor) > deriveContrast(color, darkColor)
    ? darkColor
    : lightColor;
}
