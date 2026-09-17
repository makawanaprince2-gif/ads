# Code Helper — coding Q&A website

A tiny chat website: you ask coding questions (Python, R, ML, web dev), it
remembers earlier messages in the same tab so you can say "fix that one part,
keep the rest the same," and it forgets everything the moment the tab closes.
No login, no accounts, no database.

## How it works

- `index.html` — the page you see, plain HTML/CSS/JS, no build step.
- `api/ask.js` — a serverless function. When deployed on Vercel, any request
  to `/api/ask` runs this file on Vercel's servers (not in the browser), so
  your Hugging Face token is never exposed to visitors.

## Memory model (important)

- The conversation history lives in a single JavaScript variable in the
  browser tab (`messages` in `index.html`). Every time you send a message,
  the whole history is sent along with it so the model has context.
- **Nothing is ever written** to `localStorage`, `sessionStorage`, cookies,
  or any server-side database. The serverless function is stateless — it
  only sees what you send it on that one request and forgets it immediately
  after replying.
- Closing or refreshing the tab clears `messages` because it's just a normal
  JS variable — there's nothing left to "delete" because nothing was
  persisted anywhere. The "New chat" button does the same thing manually.
- There's no login system anywhere in this code, so anyone with the link can
  open and use the page directly.

GitHub Pages can only serve static files, so it can't run `api/ask.js` —
that's why this uses **Vercel** instead: it hosts the static page *and* runs
the serverless function together, for free.

## 1. Get a free Hugging Face token

1. Create a free account at https://huggingface.co/join
2. Go to https://huggingface.co/settings/tokens
3. Create a new token (role: "read" is enough)
4. Copy it — you'll paste it into Vercel in step 3 below

## 2. Push this project to GitHub

```bash
cd code-helper
git init
git add .
git commit -m "Initial commit"
gh repo create code-helper --public --source=. --push
```

(Or create a new repo on github.com and push manually if you don't have the
`gh` CLI.)

## 3. Deploy on Vercel

1. Go to https://vercel.com and sign up (free) with your GitHub account
2. Click **Add New → Project**, select your `code-helper` repo
3. Before deploying, open **Environment Variables** and add:
   - Key: `HF_TOKEN`
   - Value: the token you copied in step 1
4. Click **Deploy**

Vercel gives you a public URL like `https://code-helper-yourname.vercel.app`
— that's accessible from anywhere, including on the college network (unless
the network specifically blocks `vercel.app` domains).

## 4. Update it later

Any time you push new commits to GitHub, Vercel automatically redeploys —
no manual steps needed.

## Notes

- The free Hugging Face Inference API can be slow to "wake up" a model on the
  first request (10–30 seconds) — the code already handles this
  (`wait_for_model: true`), so it just takes a moment rather than erroring.
- If `mistralai/Mistral-7B-Instruct-v0.2` ever becomes unavailable on the
  free tier, swap the `MODEL` constant in `api/ask.js` for another free
  instruct model's Hugging Face model ID.
- This is a genuinely free-tier setup — good for personal/coursework use.
  It is not meant for heavy traffic (rate limits are shared and fairly low).
