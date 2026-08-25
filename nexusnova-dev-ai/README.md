# NexusNova Dev AI v1

Ye **local/free NexusNova coding + SEO assistant** hai. Default brain OpenAI ka open-weight `gpt-oss:20b` model hai jo Ollama ke through aapke apne PC par run hota hai. ChatGPT Plus ya OpenAI API key is app ko chalane ke liye required nahi.

## Ye kya kar sakta hai
- NexusNova repo files list/read/search
- HTML/CSS/JS/Python waghera create/replace
- edit se pehle existing file ka automatic backup
- git status aur exact diff inspect
- safe non-main branch create/switch
- recognized npm/pytest tests/check/lint run
- local commit
- optional `gh` CLI se push + GitHub PR
- direct web page fetch
- best-effort no-key public web search for SEO/current research
- NexusNova project rules/knowledge ko local context ke taur par use

## Important limitation
Ye GPT-5.6 Sol/ChatGPT Plus ki exact copy nahi hai. `gpt-oss:20b` smaller local model hai. Web search best-effort hai aur public search endpoint kabhi block ho sakta hai. Lekin routine NexusNova coding, inspection, SEO drafts, git workflow aur checks ke liye isko specialize kiya gaya hai.

## Windows par sab se easy setup
1. Is repo ko PC par clone/download rakho.
2. `nexusnova-dev-ai\INSTALL_MODEL.bat` double-click karo.
3. Agar Ollama installed nahi hoga to official download page khulega. Install karke batch file dobara chalao.
4. Model download complete hone ke baad `START_NEXUSNOVA_AI.bat` double-click karo.
5. Phir Roman Urdu me seedha task likho, example:
   - `Meri website repo inspect karo aur broken links dhoondo.`
   - `SEO audit karo, branch banao, safe fixes karo, tests aur diff verify karo.`
   - `Telegram auth code inspect karo, working cheez bina wajah touch mat karna.`

## GitHub PR kaise allow karna hai
Push/PR default me **OFF** hai.

Pehli dafa `SETUP_GITHUB.bat` chalao. Local AI me jab PR banana ho:

```text
/github-on
```

Us session me AI non-main branch ko push karke `gh pr create` use kar sakta hai. `/github-off` se dobara band.

## Model size / hardware
Ollama library ke mutabiq `gpt-oss:20b` download roughly 14 GB hai aur model 16 GB memory class systems ke liye designed hai. Agar PC par comfortably na chale to `agent.py` ka model parameter kisi smaller Ollama tool-calling model par set kiya ja sakta hai; agent architecture model-independent rakhi gayi hai.

## Security
- File access configured workspace se bahar blocked hai.
- `.git` internal files direct edit nahi kiye ja sakte.
- Existing edited files `.nexusnova-ai/backups/` me backup hote hain.
- Arbitrary shell command tool model ko nahi diya gaya.
- GitHub push/PR explicit `/github-on` ke baghair blocked hai.
- Secrets prompt/knowledge files me store mat karo.

## Official references
- OpenAI gpt-oss-20b: https://developers.openai.com/api/docs/models/gpt-oss-20b
- OpenAI open models: https://openai.com/open-models/
- Ollama gpt-oss:20b: https://ollama.com/library/gpt-oss:20b
- Ollama tool calling: https://ollama.com/blog/tool-support
