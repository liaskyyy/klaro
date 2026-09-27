# KLARO

Minimalist browser photobooth built for instant camera captures on desktop and mobile.

## Features
- Clean landing flow and frame selection
- Live camera preview with device camera access
- 4-photo capture sequence with countdown
- Filter selection before final output
- Final print-ready strip with PNG / PDF export options
- Mobile-friendly layout for phone, tablet, and desktop

## Run locally

```bash
npm install
npm run server
```

Then open:

```text
http://localhost:8080
```

To test on a phone, connect both devices to the same Wi‑Fi network and open:

```text
http://<your-computer-ip>:8080
```

## Browser notes
- Camera permission must be allowed in the browser
- Best results in Chrome, Edge, or Safari
- Real device testing is required for camera behavior and orientation

## Project files
- index.html — app screens and UI structure
- styles.css — visual design and responsive layout
- script.js — camera capture and strip generation logic
- package.json — local server scripts
