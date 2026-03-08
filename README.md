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
