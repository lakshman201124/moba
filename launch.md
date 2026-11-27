# launch.md - MOBA Launch Day page

> Status: **design draft v1 built** as a standalone local page: `design/launch-day/index.html` (not merged into `site/` yet).
> Launch: **Tuesday, 1 December 2026** (confirmed). Opening time and address: coming later.
> After approval it moves to the website, e.g. `site/launch.html`, linked from the home page.

## Decisions log (27 Nov 2026)

| Topic | Decision |
|---|---|
| Layout | User's reference (alternating colour bands, big step numbers, tilted polaroid cards, hand-drawn arrows, floating balls, a character peeking in) used for the 3 steps. Marquees between chapters. |
| Hero | The real ₹100 MOBA "Dining Cash" note artwork (`design/launch-day/assets/moba-note.jpg`) is the hero object. |
| Where to get the note | **Not mentioned** on the page. |
| Community | **WhatsApp community group.** Link to come (`JOIN_URL` in the page script). |
| How staff check | Customer shows the note + staff see they are in the WhatsApp community → offer applies. |
| Rules | **One note per person, per bill. No minimum bill.** |
| Game | **Octopus Game** (문어 게임). Dalgona candies: circle, triangle, star + octopus + MOBA bear head. Games on the page: Dalgona, Ddakji, Gonggi (Red light, green light removed by the user). |
| Countdown | Counts to 1 Dec 2026 00:00 IST until the opening time is known (`LAUNCH` in the page script). |
| Colours (v2) | Lighter page: cream base (hero + step 1), orange step 2 and finale kept, sky step 3 kept, **cream** game section (no dark navy), **cream** members section with white outlined headline, **cream** footer, lemon marquee kept. (White was tried, then switched to cream.) Podium in light tints (peach / pale yellow / pale blue). |
| Games (v2) | Game 1 Dalgona shown clearly, tagged **Day 1 · 1 Dec**. Games 2 and 3 **blurred** with a one-line hint and "Revealed soon"; line under them: "Games 2 and 3 drop in the WhatsApp community first." (confirmed: games 2–3 are announced in the community first). |
| Hero copy (v2) | Lede now says how activation works: "Join our WhatsApp community to switch it on." Button: "Join to activate my ₹100". |

## Still open
1. Opening time → update `LAUNCH` and the "Opening time coming soon" line.
2. Store address + Google Maps link → "Where" tile and "Get directions" button.
3. WhatsApp community link → `JOIN_URL`.
4. Which games actually run on the day, and the prizes for Play / Win / Champ.
5. The 3 member rewards (draft shows: first taste of every new dish, members-only offers, surprise drops and giveaways).

---

## 1. Brand check: what we already have, and what the launch page reuses

The current site is already loud and catchy. The launch page should feel like the same brand turned up one notch, not a new look.

| What | Value (from `site/index.html` and `visual-direction.md`) | Use on the launch page |
|---|---|---|
| Orange (60%) | `#FF531B` | Big blocks, the MOBA Note itself, main buttons |
| Lemon (30%) | `#F6F396` | Hero background (same as home hero) |
| Sky blue (10%) | `#8BBEE9` | Small accents: stickers, step numbers, one card |
| Brand blue (ink accent) | `#3069B8` | Every outline + hard 6px offset shadow (logo style) |
| Sun yellow | `#FED602` | Tiny high-energy accents: "₹100" burst, countdown digits highlight |
| Ink / Cream | `#1B1A2E` / `#FFF8E7` | Body text / card surfaces |
| Display font | **Bagel Fat One**, uppercase | Headline, countdown digits, ₹100 |
| Mascot | White bear, backwards red cap, deadpan | Printed on the note like a banknote portrait; game host |
| Voice | Cheeky, hungry, loud. English + small Hangul stickers | All copy below |

**Verdict:** strong base. Fat type + orange/lemon + blue outlines + the bear is already "snack packaging" catchy. What the launch page adds is **urgency** (countdown) and **a physical object people want** (the note).

**Contrast rule (already in use):** text on orange or sky is ink, never cream (cream on `#FF531B` is only 3:1).

---

## 2. The funnel in one line

**Get the note → Join the community (activates it) → Spend it at MOBA on launch day → Play the game, win more.**

Why "Join" comes second: the note only works once it is activated, so joining has to happen *before* the store visit. That makes "join" a small, easy step people take today, while they are excited.

---

## 3. Page structure (scroll order)

Each screen does one job and has one action. Nothing else.

| # | Section | Job | One action |
|---|---|---|---|
| 1 | Hero | Hook: free money + countdown + date | Join to activate |
| 2 | How it works (3 steps) | Make it dead simple | Join to activate |
| 3 | The game | Give them a reason to actually come | (none, pure curiosity) |
| 4 | Community rewards | Make joining feel exclusive | Join the community |
| 5 | Final call | Repeat countdown, date, address | Join + Get directions |

---

## 4. Copy

### Section 1: Hero

- **Sticker (top):** `MOBA LAUNCH DAY` · `모바 오픈`
- **Headline:** **WE PRINTED OUR OWN MONEY.**
- **Sub:** Get a **₹100 MOBA Note**. Spend it at MOBA on launch day.
- **Visual:** the MOBA Note (see section 5), big, tilted, bear portrait, "₹100" burst sticker.
- **Countdown:** `03 DAYS : 14 HRS : 22 MIN : 09 SEC` (live)
- **Date line:** **TUE, 1 DEC 2026** · [TIME] · [AREA, CITY]
- **Button:** **JOIN TO ACTIVATE** →
- **Tiny line under button:** Free. Takes 10 seconds.

Alternatives for the headline (pick one):
1. WE PRINTED OUR OWN MONEY. *(recommended: curious, cheeky, instantly visual)*
2. FREE ₹100. ON US.
3. YOUR FIRST ₹100 IS ON THE BEAR.

### Section 2: How it works

- **Heading:** **3 STEPS. ₹100 OFF.**

| Step | Title | One line |
|---|---|---|
| 1 | **GET IT** | Grab your ₹100 MOBA Note. [WHERE: TBD] |
| 2 | **JOIN** | Join the MOBA community. Your note is now **active**. |
| 3 | **SPEND IT** | Bring it to MOBA on 1 Dec. ₹100 off your bill. |

- **Bonus sticker (pinned to step 2):** **+ CLAIM EXCLUSIVE REWARDS** (community only)
- **Button:** JOIN TO ACTIVATE →

### Section 3: The game (at the store)

- **Sticker:** `LAUNCH DAY ONLY` · `게임 시작`
- **Headline:** **ARE YOU READY FOR THE OCTOPUS GAME?** *(name: see choices below)*
- **Sub:** Play a quick Korean street game at the store. **Win, and your ₹100 gets bigger.**
- **3 tiles (rule of three):**
  - **PLAY** → everyone who plays gets [SMALL PRIZE]
  - **WIN** → bigger offer: [OFFER]
  - **CHAMPION** → top prize: [PRIZE]
- **Teaser line:** Which game? You find out at the door. 🐙

Game name choices:
1. **OCTOPUS GAME** *(recommended, the user's pick)*: everyone gets the reference in one second, and octopus (낙지, nakji) is real Korean food. Keep it to the **name only**: no pink guards, no circle/triangle/square masks, no green tracksuits, no giant doll. Those belong to the show; our look stays MOBA (bear as host in his red cap, orange/lemon, blue outlines).
2. **THE BAP GAMES** (밥 게임): on-brand pun on "bap" (the BA in MOBA).
3. **TTEOK OR TREAT**: playful, food-first.

Game ideas (real traditional Korean playground games, quick, work in a store, all public domain):
- **Dalgona cut-out**: pop the shape out of the sugar candy without breaking it.
- **Ddakji flip**: flip the folded paper tile with yours.
- **Red light, green light** (무궁화 꽃이 피었습니다): bear-host version.
- **Gonggi**: five-stone catch.

### Section 4: Community rewards

- **Heading:** **MEMBERS EAT BETTER.**
- **Sub:** Join the MOBA community and unlock rewards nobody else gets.
- **3 reward cards:** [REWARD 1] · [REWARD 2] · [REWARD 3] *(e.g. first look at new dishes, members-only offers, birthday treat: to confirm)*
- **Button:** JOIN THE COMMUNITY →

### Section 5: Final call

- **Headline:** **SEE YOU ON 1 DEC.** · `같이 밥 먹어요` (let's eat together)
- **Countdown again** (smaller)
- **Date · time · address**
- **Buttons:** JOIN TO ACTIVATE (primary) · GET DIRECTIONS (secondary)
- **Fine print (one line):** One note per bill. Valid on launch day only. Not exchangeable for cash. [CONFIRM]

---

## 5. The MOBA Note (the physical currency)

- **Name:** **MOBA Note** *(alternatives: MOBA Money, Bap Bucks)*
- **Value:** ₹100, spent at the MOBA store on launch day.
- **Look:** orange note, blue outline, the bear as the "portrait", 모바 in the corner, a serial number, "₹100" in Bagel Fat One. On the page it is the hero object, so the website image and the printed note should be the same artwork.

---

## 6. The psychology we use (and where)

| Principle | Where on the page |
|---|---|
| **Curiosity gap** | "We printed our own money" makes people read the next line |
| **Urgency / deadline** | Live countdown in the hero and again at the end |
| **Endowment** (people value what they already hold) | Calling it *their* note, a real physical object, "activate" not "sign up" |
| **Rule of three** | 3 steps, 3 game tiers, 3 rewards. Easy to remember |
| **Small first step** | "Join" is free and takes 10 seconds. The big step (visiting) comes later |
| **Exclusivity / belonging** | "Members eat better", rewards only for the community |
| **Open loop** | "Which game? You find out at the door." Pulls them to the store |
| **Repetition** | Same button text ("Join to activate") everywhere, one action |

**Copy rules:** headlines ≤ 7 words, sub-lines ≤ 15 words, one button per screen, no paragraphs.

---

## 7. Open items (need answers before build)

1. **Launch date + time:** confirm Tuesday 1 Dec 2026, and the opening time.
2. **Where do people get the note?** Handed out on the street, at the store, in delivery bags, at a stall?
3. **Community = which platform?** WhatsApp group / WhatsApp channel / Instagram broadcast? Need the join link.
4. **How does "activate" work at the counter?** E.g. staff checks the member is in the group, or a code is shared in the group.
5. **Rules:** one note per person or per bill? Minimum bill? Launch day only?
6. **Game:** final name, which game(s), and the actual prizes for Play / Win / Champion.
7. **Community rewards:** the 3 rewards.
8. **Store address** for the date line and "Get directions".
