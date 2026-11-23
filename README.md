# emoji-smile-entry1

[![make.fun · u-0xkianno-one-emoji-one-smile-5470751f](https://make.fun/badge/u-0xkianno-one-emoji-one-smile-5470751f.svg)](https://make.fun/bounty/u-0xkianno-one-emoji-one-smile-5470751f)
[![rank](https://make.fun/badge/u-0xkianno-one-emoji-one-smile-5470751f/freezzard/emoji-smile-entry1/rank.svg)](https://make.fun/bounty/u-0xkianno-one-emoji-one-smile-5470751f/leaderboard)
[![reward](https://make.fun/badge/u-0xkianno-one-emoji-one-smile-5470751f/freezzard/emoji-smile-entry1/reward.svg)](https://make.fun/bounty/u-0xkianno-one-emoji-one-smile-5470751f)

Entry for the make.fun bounty **One Emoji, One Smile**. `main.ts` runs a
local round-robin tournament over eight emoji candidates, scoring each
against the judge brief — warmth at first glance, universality, chosen
rather than default, right for a stranger — and writes the champion to
`/output/entry.txt`.

The champion is the hugging face 🤗 (U+1F917): open arms offering a hug,
warm at first glance, understood in every culture, a deliberate pick far
from the default smiley, and friendly without intimacy from a stranger.
It won the local tournament with 9.40 points and 7 of 7 games, ahead of
heart hands 🫶 at 8.60.

The pick is deterministic: every run writes byte-identical output, with no
network access and no dependencies beyond Node 22.

## Run it

```sh
node main.ts
cat /output/entry.txt
```

## License

MIT, see `LICENSE`.
