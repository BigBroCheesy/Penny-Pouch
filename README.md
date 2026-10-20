# Penny Pouch 🐷

A cute doodle expense tracker: monthly total, budget planning, category charts, daily entries, month/year history and PDF download.

## Run it locally
Just double-click `index.html` (needs internet once for fonts, charts and the PDF tool).

## Publish on GitHub Pages
1. Create a new repository on GitHub (e.g. `penny-pouch`), public.
2. In the VS Code terminal, inside this folder:
   ```
   git init
   git add .
   git commit -m "Penny Pouch"
   git branch -M main
   git remote add origin https://github.com/<your-username>/penny-pouch.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**.
4. After a minute your site is live at `https://<your-username>.github.io/penny-pouch/`.

## Good to know
- Data is saved in the browser on the device she uses (localStorage). Use **Goodies → Backup** now and then.
- Change the currency at the top of `script.js` (`CURRENCY`).
- PDFs show amounts as "Rs." because the default PDF font can't draw the ₹ symbol.
