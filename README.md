# Gdgoc_hozai

## 🚀 About the Project

**Gdgoc_hozai** is a 24-hour hackathon project developed for **GDGOC-BWAI** (Google Developer Groups on Campus – Build With AI). The project was built under time pressure as a collaborative effort by a passionate team of developers participating in the hackathon challenge.

## 👥 Team Members

| Name            |
|-----------------|
| Ousman          |
| Hazib           |
| Abdullah        |
| Ali Zain        |
| Maaz ur Rehman  |

## 🛠️ Built With

- Developed during a 24-hour hackathon sprint
- Powered by collaboration and creativity under **GDGOC-BWAI**

## 📌 Getting Started

Clone the repository and explore the project:

```bash
git clone https://github.com/MuhammadOusman/Gdgoc_hozai.git
cd Gdgoc_hozai
```

## 🚧 Project Layout

- `frontend/` — placeholder for future frontend/UI work.
- `backend/` — shared server-side logic and webhook validation.
- `api/` — Vercel serverless endpoints.

## 🚀 Vercel Deployment

This repo is now structured for Vercel deployment.

1. Connect the repo to Vercel.
2. Add `WEBHOOK_BEARER_SECRET` to Vercel Environment Variables (optional).
3. Use `/order-webhook` for webhook requests.
4. Use `/health` for a simple status check.
5. Open the home page to use the built-in webhook JSON tester UI.

When your store sends a webhook to `/order-webhook`, the home page will also display the latest received payload in real time.

> Production webhook URL: `https://<your-vercel-app>.vercel.app/order-webhook`
> 
> Health check: `https://<your-vercel-app>.vercel.app/health`

For local development, install the Vercel CLI and run:

```bash
npm install -g vercel
npm run dev
```

## 🤝 Contributing

This project was created as part of a hackathon. Feel free to fork the repository and build on top of it!

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
