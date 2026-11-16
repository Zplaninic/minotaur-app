# Design values

Source: Minotaur brand book.

## Colors

### Primary

| Token         | HEX       |
| ------------- | --------- |
| `green-dark`  | `#014131` |
| `red`         | `#FF2C00` |
| `green-light` | `#87C38F` |
| `beige`       | `#E7DED3` |

### Secondary (tints)

Each primary in 10% steps toward white. Token naming: `<color>-<step>`, e.g.
`green-dark-20`. Tints support the primaries (backgrounds, surfaces,
hierarchy) and never replace them in a leading role.

| Step | `green-dark` | `red`     | `green-light` | `beige`   |
| ---- | ------------ | --------- | ------------- | --------- |
| 100  | `#014131`    | `#FF2C00` | `#87C38F`     | `#E7DED3` |
| 90   | `#1A5446`    | `#FF4119` | `#93C99A`     | `#E9E1D7` |
| 80   | `#34675A`    | `#FF5633` | `#9FCFA5`     | `#ECE5DC` |
| 70   | `#4D7A6F`    | `#FF6B4D` | `#ABD5B1`     | `#EEE8E0` |
| 60   | `#678D83`    | `#FF8066` | `#B7DBBC`     | `#F1EBE5` |
| 50   | `#80A098`    | `#FF9680` | `#C3E1C7`     | `#F3EEE9` |
| 40   | `#99B3AD`    | `#FFAB99` | `#CFE7D2`     | `#F5F2ED` |
| 30   | `#B3C6C1`    | `#FFC0B2` | `#DBEDDD`     | `#F8F5F2` |
| 20   | `#CCD9D6`    | `#FFD5CC` | `#E7F3E9`     | `#FAF8F6` |
| 10   | `#E6ECEA`    | `#FFEAE6` | `#F3F9F4`     | `#FDFCFB` |

### Contrast

`green-dark` is the only primary that passes as body text on light surfaces.
`red` passes only as large text and accents, on white and on `green-dark`.

## Typography

| Token          | Family          | Use                               |
| -------------- | --------------- | --------------------------------- |
| `font-display` | Red Hat Display | headings, key messages            |
| `font-body`    | Figtree         | body text, subheadings, interface |

| Token             | Weight |
| ----------------- | ------ |
| `weight-regular`  | 400    |
| `weight-semibold` | 600    |
| `weight-black`    | 900    |

## Spacing

| Token      | px |
| ---------- | -- |
| `space-1`  | 4  |
| `space-2`  | 8  |
| `space-3`  | 12 |
| `space-4`  | 16 |
| `space-6`  | 24 |
| `space-8`  | 32 |
| `space-12` | 48 |
| `space-16` | 64 |

## Type scale

| Token       | px |
| ----------- | -- |
| `text-xs`   | 12 |
| `text-sm`   | 14 |
| `text-md`   | 16 |
| `text-lg`   | 20 |
| `text-xl`   | 24 |
| `text-2xl`  | 32 |
| `text-3xl`  | 40 |

| Token                 | Value |
| --------------------- | ----- |
| `line-height-heading` | 1.2   |
| `line-height-body`    | 1.5   |

## Logo

| File                    | Contents                                     |
| ----------------------- | -------------------------------------------- |
| `minotaur_logo.png`     | symbol + "minotaur" wordmark                 |
| `spk_minotaur_logo.png` | symbol + wordmark + "SPORTSKO PENJAČKI KLUB" |

Both are transparent PNGs for light backgrounds. Use the files as given.

Logo colors per background:

| Background    | Symbol        | Wordmark | Tagline      |
| ------------- | ------------- | -------- | ------------ |
| `green-dark`  | `green-light` | `red`    | `beige`      |
| `green-light` | `green-dark`  | `red`    | `green-dark` |
| `beige`       | `green-dark`  | `red`    | `green-dark` |

## Interface

| Token               | Value                                     |
| ------------------- | ----------------------------------------- |
| `border-width`      | 1px                                       |
| corner radius       | none, square corners                      |
| `color-backdrop`    | `green-dark` at 50% alpha                 |
| `width-dialog`      | 40rem, maximum                            |
| `width-page`        | 72rem, maximum                            |
| `breakpoint-narrow` | 48rem; narrower screens get phone layouts |

Borders on inputs use `green-dark-60`; table lines use `green-dark-30`. A
field with an error has a `red` border and its message in `green-dark` text
on `red-10`.
