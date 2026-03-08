# Iran–UAE & Gulf War News

Real-time news aggregator for **Iran’s strikes on the UAE** and the broader **US–Iran–Israel war**, pulling from:

- **Al Jazeera** (all news + Middle East)
- **BBC News Middle East**

Stories are merged, deduplicated, and sorted by publish time. A filter lets you prioritise items that mention Iran, UAE, Gulf, strikes, and related terms.

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). The page auto-refreshes every 90 seconds.

## Notes

- All content is from the linked sources; always open the original article to verify.
- For more sources (e.g. Reuters), add their RSS URLs in `server.js` in the `FEEDS` array.

### Liveblog link (automatic)

The pinned “Live” card points to Al Jazeera’s current Iran war liveblog. The server **discovers the URL automatically** by checking Al Jazeera’s [Israel–Iran conflict tag page](https://www.aljazeera.com/tag/israel-iran-conflict/) and extracting the latest liveblog link, so when they start a new day or change the slug, the card updates without any manual change (after the 5‑minute cache refreshes).

To **force a specific URL** (e.g. if discovery fails), set the `LIVEBLOG_URL` env var (or edit `LIVEBLOG_URL_FALLBACK` in `server.js`).
