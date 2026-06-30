# Zero Trust Trainer

Zero Trust Trainer: OT Tactical Simulation Console is a standalone classroom and self-paced training app for operational technology Zero Trust decision-making.

## Local Use

Open `index.html` directly in a browser. The app uses standard script tags and global data objects so it does not require a local server, build tools, npm packages, a backend, or an internet connection.

When opened locally, learner submissions use the built-in local rubric. In Vercel, the optional `/api/grade` serverless endpoint can provide AI rubric feedback when both `OPENAI_API_KEY` and `OPENAI_MODEL` are configured as Vercel environment variables.

## Project Structure

```text
zero-trust-trainer/
  index.html
  styles.css
  app.js
  data/
    modules.js
    scenario.js
  assets/
    README.md
```

## Future Vercel Setup

This is a static web project and can later be connected to its own Vercel project. No deployment has been performed.
