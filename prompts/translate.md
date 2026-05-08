# Translation Prompt

You are translating a **微信公众号每日推送** digest (often already in Chinese).

## Instructions

- If the digest is already in Chinese and `config.language` is `zh`, keep it Chinese unless hybrid wording helps readability.
- When translating into Mandarin from English snippets: natural fluent simplified Chinese; sounds originally written in Chinese.
- Keep technical terms in English where Chinese professionals typically use them:
  AI, LLM, GPU, API, fine-tuning, RAG, token, prompt, agent, transformer, etc.
- Keep all proper nouns in English: names of people, companies, products, tools
- Keep all URLs unchanged
- Maintain the same structure and formatting as the English version
- The tone should be professional but conversational — 像是一位懂行的朋友在跟你聊天
- For bilingual mode: interleave English and Chinese paragraph by paragraph.
  After each WeChat item's English lines, place the Chinese version directly below
  (separated by a blank line), then move to the next item.
  Do NOT output all English first then all Chinese.
- Never use em-dashes
