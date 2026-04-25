# AI Conversation Quality Spec

Single source of truth for what "good AI conversation" means in NativeFlow.
No code changes should be made without passing the test matrix in this document.

---

## 1. Core Principles

| Principle | Rule |
|---|---|
| Audio first | AI text hidden during playback. User listens before reading. |
| Beginner-friendly | Short sentences, simple words, no idioms. |
| Natural but controlled | Deterministic templates, not free-form LLM generation. |
| Always answer reciprocal | "And you?" must get a brief answer before the lesson question. |
| Never ignore user intent | If the user asks something, answer it. If confused, help. |
| Do not over-question | Not every turn needs a question. Comment-only turns are allowed. |
| Keep lesson progression | 5 turns max. Cover scene dimensions. Wrap naturally. |

---

## 2. Required Behaviors

### 2.1 Reciprocal Questions
**Trigger:** User ends with "and you?", "how about you?", "what about you?", "you too?", "how are you?"
**Response:** Brief warm answer (max 8 words) + engine question.
**Example:** "I'm good too, thanks! Do you clean up after breakfast?"

### 2.2 Confused User
**Trigger:** "I don't understand", "I don't know", "What does that mean?", "Can you explain?"
**Response:** Use `clarificationPrompts.confusion` template from scene data.
**Example:** "No problem. Do you wash dishes after breakfast?"

### 2.3 Off-Topic
**Trigger:** User says something unrelated to the scene.
**Response:** Ack + "By the way," + engine question.
**Example:** "Okay. By the way, do you clean up alone?"

### 2.4 ASR Noise / Garbled
**Trigger:** Nonsense syllables, broken words, no recognizable English.
**Response:** Use `clarificationPrompts.garbled` template.
**Example:** "Not sure I understood. What do you clean first?"

### 2.5 Comment-Only Turn
**Trigger:** Turn 2, object or people dimension, meaning.value exists.
**Response:** Ack + value-aware bridge + "Tell me more." (no dimension question).
**Example:** "Okay. The dishes first -- got it. Tell me more."

### 2.6 Wrong-Slot Answer
**Trigger:** User answer doesn't match expected dimension's slot keywords.
**Response:** Scene-specific repair template.
**Example:** "Sorry, what do you clean first?"

### 2.7 Audio-First Display
**Default:** Conversation transcript hidden. User taps toggle to show.
**During AI audio:** Current AI message hidden. Shows pulsing speaker indicator.
**After audio ends:** AI text revealed.

---

## 3. Ideal Conversation Shape

Scene: `breakfast_cleanup` ("I clean up after breakfast.")

```
Turn 0 (greeting):
  User: "Hi, how are you?"
  AI: "I'm good too, thanks! Do you clean up after breakfast?"
  [answerToAi + engine anchor question]

Turn 1 (anchor answer):
  User: "Yes, I do."
  AI: "Sounds like it. What do you clean first?"
  [yes reaction + engine object question]

Turn 2 (object -- comment-only):
  User: "The dishes."
  AI: "Okay. The dishes first -- got it. Tell me more."
  [ack + bridge + soft prompt, NO question]

Turn 3 (people answer):
  User: "With my mom."
  AI: "Right. With mom -- that's nice. Do you do it every day?"
  [ack + bridge + engine frequency question]

Turn 4 (wrap):
  User: "Yes, every day."
  AI: "Nice talking with you. See you later!"
  [wrap template]
```

Characteristics:
- 5 turns, 5 user responses
- 1 comment-only turn (turn 2)
- 3 turns with questions
- 1 greeting + 1 wrap
- Value-aware bridges on turns 2 and 3
- No duplicate acks
- No interview feel

---

## 4. Failure Examples

### 4.1 "And you?" ignored
```
BAD:
  User: "I'm good, thank you. And you?"
  AI: "Oh, okay. Do you clean up after breakfast?"

GOOD:
  User: "I'm good, thank you. And you?"
  AI: "I'm good too, thanks! Do you clean up after breakfast?"
```

### 4.2 Question-only interview
```
BAD:
  AI: Do you clean up after breakfast?
  AI: What do you clean first?
  AI: Do you clean alone?
  AI: Do you do it every day?
  AI: See you!

GOOD:
  AI: Do you clean up after breakfast?
  AI: Sounds like it. What do you clean first?
  AI: Okay. The dishes first -- got it. Tell me more.
  AI: Right. With mom -- that's nice. Do you do it every day?
  AI: Nice talking with you. See you later!
```

### 4.3 Wrong repair question
```
BAD:
  User: "I grew up in a stable." (engineDimension=object)
  AI: "How long does it take?" (time repair -- WRONG dimension)

GOOD:
  AI: "Sorry, what do you clean first?" (object repair -- correct)
```

### 4.4 Bridge mismatch
```
BAD:
  User: "With my friends." (meaning.type=person, engineDimension=frequency)
  AI: "friends -- makes sense." (frequency bridge with person value)

GOOD:
  AI: "Thanks for sharing. How often do you eat out?" (generic reaction, correct)
```

### 4.5 Text shown before audio
```
BAD:
  [AI audio starts playing]
  [AI text bubble already visible -- user reads ahead]

GOOD:
  [AI audio starts playing]
  [Pulsing speaker indicator shown]
  [Audio ends]
  [AI text bubble appears]
```

---

## 5. Fixed Test Matrix

### Normal Flow

| # | Turn | User Input | Expected AI Reply Pattern | Check |
|---|---|---|---|---|
| T01 | 0 | "Hi!" | greeting + anchor question | Greeting path |
| T02 | 0 | "I'm good, and you?" | reciprocal answer + anchor question | Reciprocal detection |
| T03 | 1 | "Yes, I do." | yes reaction + next question | Yes pool filled |
| T04 | 1 | "No, not really." | no reaction + next question | No pool works |
| T05 | 2 | "The dishes." (dim=object) | ack + bridge + "Tell me more." | Comment-only turn |
| T06 | 3 | "With my mom." (dim=people) | ack + bridge + next question | Bridge template |
| T07 | 4 | "Yes, every day." | wrap template | Closing |
| T08 | 4 | "See you!" (user closes) | wrap template | User-initiated close |

### Reciprocal Questions

| # | Turn | User Input | Expected AI Reply Pattern | Check |
|---|---|---|---|---|
| T09 | 0 | "How about you?" | warm answer + anchor question | Reciprocal at greeting |
| T10 | 0 | "What about you?" | warm answer + anchor question | Reciprocal variant |
| T11 | 2 | "Yes. How about you?" | brief answer + next question | Reciprocal mid-conversation |
| T21 | 0 | "How are you?" | warm answer + anchor question | Social greeting reciprocal |
| T22 | 0 | "Fine, and you?" | warm answer + anchor question | Short social + reciprocal |
| T23 | 1 | "I'm good. How about you?" | warm answer + next question | Social answer + reciprocal |

### Error Handling

| # | Turn | User Input | engineAction | Expected | Check |
|---|---|---|---|---|---|
| T12 | 2 | "mekwinyapalawan" | clarify | garbled template | Nonsense detection |
| T13 | 2 | "Um" | clarify | garbled template | Fragment detection |
| T14 | 2 | "I don't understand." | simplify | confusion template | Confused user |
| T15 | 2 | "Can you explain?" | simplify | confusion template | Confused variant |
| T16 | 2 | "I grew up in a stable." | ask_dimension (dim=object) | object repair template | Wrong-slot repair |
| T17 | 2 | "I saw a cat video." | redirect | ack + "By the way," + question | Off-topic redirect |

### Cross-Scene

| # | Scene | Turn | User Input | Expected | Check |
|---|---|---|---|---|---|
| T18 | wake_up | 2 | "Around seven." (dim=time) | ack + time bridge + question | Bridge works cross-scene |
| T19 | restaurant | 2 | "Ramen." (dim=object) | ack + object bridge + "Tell me more." | Comment-only cross-scene |
| T20 | school | 2 | "Math." (dim=object) | ack + object bridge + "Tell me more." | Comment-only cross-scene |

### Universal Social Intent

| # | User Input | Expected Intent | Expected Behavior | Check |
|---|---|---|---|---|
| T24 | "Thanks, and you?" | reciprocal_greeting | warm answer + question | Reciprocal wins over thanks |
| T25 | "Sorry, can you say that again?" | apology | confusion/clarify template | Apology detected |
| T26 | "Bye, see you." | farewell | wrap template | Farewell detected |
| T27 | "Can you explain?" | confusion | confusion template | Confusion detected |
| T28 | "Tell me more." | continuation | normal progression | Continuation detected |

### Negative Cases (must NOT trigger reciprocal_greeting)

| # | User Input | Expected Intent | Check |
|---|---|---|---|
| T29 | "Yes I do." | null | Normal scene answer |
| T30 | "The dishes." | null | Object answer |
| T31 | "About ten minutes." | null | Time answer |
| T32 | "With my family." | null | Person answer |
| T33 | "I feel good." | null | Feeling answer |

### Universal Answer Intent (Phase 2 — detection only, no runtime change)

| # | User Input | Expected Answer Intent | Check |
|---|---|---|---|
| A01 | "Yes, I do." | yes_answer | Affirmative |
| A02 | "No, not really." | no_answer | Negative |
| A03 | "The dishes." | object_answer | Object/thing |
| A04 | "With my mom." | person_answer | Person |
| A05 | "At home." | place_answer | Place |
| A06 | "Around seven." | time_answer | Time (spelled) |
| A07 | "Every day." | frequency_answer | Frequency |
| A08 | "I feel good." | feeling_answer | Feeling |
| A09 | "I like coffee." | preference_answer | Preference |
| A10 | "Because I'm tired." | reason_answer | Reason |
| A11 | "Yeah sure." | yes_answer | Yes variant |
| A12 | "Nope." | no_answer | No variant |
| A13 | "The table and the cups." | object_answer | Multi-object |
| A14 | "By myself." | person_answer | Solo |
| A15 | "In the morning." | time_answer | Time phrase |
| A16 | "How are you?" | null | Social, not answer |
| A17 | "Hi!" | null | Greeting, not answer |
| A18 | "Bye!" | null | Farewell, not answer |
| A19 | "mekwinyapalawan" | null | Nonsense |
| A20 | "Um" | null | Fragment |

### Korean Social Intent Detection (Phase 4 — detection only, lang='ko')

| # | User Input | Expected Social Intent | Check |
|---|---|---|---|
| K01 | "안녕" | greeting | Korean greeting |
| K02 | "잘 지냈어?" | reciprocal_greeting | Korean reciprocal |
| K03 | "너는?" | reciprocal_greeting | Short Korean reciprocal |
| K04 | "고마워" | thanks | Korean thanks |
| K05 | "미안해" | apology | Korean apology |
| K06 | "잘 가" | farewell | Korean farewell |
| K07 | "모르겠어" | confusion | Korean confusion |
| K08 | "계속해" | continuation | Korean continuation |
| K09 | "오늘 어때?" | reciprocal_greeting | Korean mood reciprocal |
| K10 | "감사합니다" | thanks | Formal Korean thanks |

---

## 6. Acceptance Criteria

The AI conversation engine is NOT acceptable for release unless:

1. **33/33 social + 20/20 answer test matrix passes** -- every test case produces the expected result.
2. **Reciprocal questions pass 100%** -- "And you?", "How about you?", "What about you?" always get a brief answer before the lesson question.
3. **No wrong repair question** -- repair uses the correct engine dimension's template, never a mismatched dimension.
4. **No AI text before audio** -- current AI message is hidden during playback, revealed after.
5. **No user confusion after comment-only turn** -- comment-only replies end with "Tell me more." as a soft prompt.
6. **Bridge-dimension alignment** -- bridge templates only used when meaning.type matches engineDimension.
7. **TypeScript 0 errors** -- `npx tsc --noEmit` passes clean.
8. **Lint 0 new errors** -- no new lint errors introduced.

---

## Version History

| Date | Version | Changes |
|---|---|---|
| 2026-04-26 | 1.0 | Initial spec created from V2.6/V2.7 stabilization work |
