Browser regression checks. Run from the repo root with Playwright installed:

    node tests/bulk-add.js        # Nadia: pasted names become separate cards, field clears
    node tests/checks-and-cdl.js  # residence card, CDL gate on every route into Offer, Rohan's dates

Each line prints the result; bulk-add expects "delta 3" for three names and "delta 1" for "Lopez, Maria".
