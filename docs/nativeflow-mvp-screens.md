# NativeFlow MVP Screens

This document defines all MVP screens and their responsibilities. NativeFlow must feel like a **daily speaking training product**—not a vocabulary app, grammar app, generic chatbot, or feature-heavy dashboard.

---

## 1. Home Screen

**Purpose:** Show the most important action for today. Answer “What do I do now?” in one glance. Home is not a dashboard; it is an action screen for today’s speaking mission.

**Content:**

- Greeting
- Today’s speaking mission (one clear sentence)
- Scene name (e.g. Coffee Shop)
- Estimated lesson time
- Current streak
- Review reminder if there are due reviews
- **Primary CTA:** Start today’s lesson

**Rules:**

- Only one main CTA above the fold.
- Avoid feature clutter (no large scene lists, no mode picker).
- Avoid large scene lists; the app recommends today’s lesson, not a menu.

**Success condition:** User immediately starts the lesson (ideally within 10 seconds of opening the app).

---

## 2. Lesson Start Screen

**Purpose:** Prepare the user before speaking. Set context and expectations without requiring choices.

**Content:**

- Scene title
- Scene description (short; why this situation matters)
- Lesson steps preview (e.g. Listen → Repeat → Pattern Practice → Guided Conversation → Free Conversation)
- Estimated time
- Lesson goal (one line)
- Start button

**Rules:**

- Single path: start this lesson. No branching or mode selection.
- Information supports confidence; it does not overwhelm.

---

## 3. Speaking Lesson Screen

**Purpose:** This is the most important screen. Deliver all structured speaking steps in one shared layout so the user stays in “speaking mode,” not in “learning a new UI” mode.

**Design:** One shared layout for multiple step types.

**Steps supported:**

- Listen
- Repeat
- Pattern Practice
- Guided Conversation

**Shared layout must include:**

- Progress indicator (e.g. step X of Y)
- Step label (Listen / Repeat / Pattern Practice / Guided Conversation)
- Scene context (e.g. “Coffee Shop”)
- Main prompt area (instruction, question, or pattern)
- Hint / example area (optional; expandable or below)
- Large speak button (primary action)
- Retry option where relevant

**Rules:**

- Same layout across steps; only content and step label change.
- One primary action per step (listen or speak). Large, consistent button placement.
- Each step presents one task at a time; the user should never have to interpret multiple simultaneous actions on the same step.
- No extra navigation or mode switches mid-lesson.

---

## 4. Free Conversation Screen

**Purpose:** Allow freer speaking after preparation. Still scene-based and guided by context—not a blank chat box.

**Content:**

- Scene reminder (e.g. “You’re at the coffee shop.”)
- AI prompt (question or situation to respond to)
- Large speak button
- Hint options (optional; e.g. suggested phrases or ideas)
- End conversation CTA (clear exit when done)

**Rules:**

- Must NOT be a blank chat box. User always has scene context and a prompt.
- Free conversation is the last rung of the ladder; it follows Listen → Repeat → Pattern → Guided.
- End conversation is visible and intentional so the lesson has a clear finish.

---

## 5. Result Screen

**Purpose:** Create a sense of completion and continuity. Reinforce “I did my speaking today.”

**Content:**

- Completion message (e.g. “You did it!”)
- Speaking time (e.g. total minutes spoken today)
- Scene name (what was completed)
- Learned phrases (short list; optional)
- One mistake to review (optional; single focus)
- Updated streak

**Rules:**

- Positive, simple closure. No heavy analytics or multiple metrics.
- One “next” action if any (e.g. “Back to Today” or “Do review”). No competing CTAs.
- Progress emphasizes continuity (streak, time), not complexity.

---

## 6. Review Screen

**Purpose:** Provide lightweight SRS review. User speaks again (or listens and repeats); it is still a speaking action, not a passive flashcard list.

**Content:**

- Due review count (how many items to review today)
- Phrase cards (or sentence pattern / scene expression / guided output item)
- Mistake replay (if we store one “mistake to review” from the lesson)
- Speak again button (primary action per item)
- Mark done / retry (per item)

**Rules:**

- One primary action per card: speak (or listen then speak). No long flows.
- Clear “done” state so the user knows when review is complete.
- Review feels like “speaking practice,” not like a separate vocabulary app.

---

## 7. Progress Screen

**Purpose:** Show continuity and long-term growth. Reassure the user that the habit is building.

**Content:**

- Streak (consecutive days)
- Total speaking time (all-time or since start)
- Weekly speaking minutes (simple)
- Completed lessons (count or list)
- Reviewed phrases (count)

**Rules:**

- Progress emphasizes continuity, not complexity. No feature-heavy dashboard.
- Simple numbers and maybe one simple chart (e.g. weekly minutes). No overwhelming stats.
- Same tone as the rest of the app: “You’re building a daily speaking habit.”

---

## Summary: MVP Screen Map

| Screen              | Primary purpose                         | Primary action              |
|---------------------|------------------------------------------|-----------------------------|
| Home                | Show today’s mission and next step       | Start today’s lesson        |
| Lesson Start        | Set context before speaking              | Start lesson                |
| Speaking Lesson     | Do Listen / Repeat / Pattern / Guided    | Speak (or Listen)           |
| Free Conversation   | Open turn in same scene                  | Speak / End conversation   |
| Result              | Completion and continuity               | Back to Today (or Review)   |
| Review              | SRS review (phrase, pattern, etc.)        | Speak again / Mark done     |
| Progress            | Streak, time, growth                     | View only (no primary CTA)  |

---

## Final Requirement

NativeFlow must feel like:

**A daily speaking training product.**

It must **not** feel like:

- A vocabulary app  
- A grammar app  
- A generic chatbot  
- A feature-heavy dashboard  

All MVP screens should be designed and refined with this distinction in mind.
