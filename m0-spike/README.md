# Ember M0: mic spike

A throwaway page that tests live pitch detection from an acoustic guitar on iPad Safari. It is not the real app.

Pass condition: a steady reading on the open low E string (about 82.41 Hz).

## Run it

```bash
npm install
npm run dev     # local dev server
npm run build   # type-check, then build the static site into dist/
```

`npm run dev` is enough for a desktop browser on `localhost`. **The iPad needs HTTPS:** Safari won't offer the mic on the plain `http://192.168...` address the dev server prints, so deploy `dist/` first.

## Deploy dist/ over HTTPS

Run `npm run build` first. Each option gives you an `https://` address to open on the iPad.

1. **Netlify Drop (no account setup or command line):** open https://app.netlify.com/drop and drag the `dist` folder onto the page.
2. **Cloudflare Pages:** run `npx wrangler pages deploy dist` and follow the login prompt.
3. **GitHub Pages:** run `npx gh-pages -d dist`, then in the GitHub repo go to Settings > Pages and set the source to the `gh-pages` branch. The repo must be public on a free plan.

## Test on the iPad

1. Open the HTTPS address in Safari and tap **Tap to start**. Allow the mic.
2. Stay quiet for the first second while the noise floor is measured.
3. Play each open string, low E first, and watch the frequency, cents and the octave jumps counter.
4. Use Share > Add to Home Screen, open it from there, and repeat. Note whether it asks for the mic again on each launch.
