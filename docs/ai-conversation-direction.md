# NativeFlow AI Conversation: Guided Activation

## Design principle

NativeFlow AI conversation is **AI-led guided activation practice**, not open-ended free talk first.

- The **AI starts** the conversation.
- The **AI asks questions** related to the exact phrases and patterns the user just learned in the lesson.
- The **user responds** using those learned phrases.
- The **AI continues** so the user can **activate** recently learned English in a safe, scaffolded way.

This is **not** “free chat first.” It is **guided activation**: the AI prompts are derived from lesson content so that the user practises what they have just learned.

---

## Examples

If the lesson teaches:

- *I'd like a coffee.*
- *Can I get this to go?*
- *How much is it?*

The AI should initiate with prompts such as:

- *What would you like to drink?*
- *Would you like it to go or for here?*
- *Do you want anything else?*

The user then uses the learned phrases to answer. The AI keeps the conversation in the same scene and encourages use of the target patterns.

---

## Architecture note

Future conversation systems (e.g. conversation-lesson flows, post-lesson AI practice, daily story dialogue) should stay aligned with **AI-led guided activation**:

- Prompts and system instructions should be driven by **recently learned phrases and the current scene**.
- The AI role should stay **scene-consistent** (e.g. barista, colleague) and guide the learner to use the target language.
- Open-ended chat-first behaviour should be avoided in favour of this guided, lesson-anchored flow.

When adding or changing conversation UIs or APIs, keep this model in mind so the product stays focused on activation of lesson content rather than generic chat.
