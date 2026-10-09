# Witness desk

Find one vehicle across every camera in a city.

A witness gives the city, an optional time, the body type, and the color. Witness desk searches the indexed footage and lays the closest clips out as a network. You watch each clip, mark yes or no, and keep a still with the case.

Live site: https://witness-desk.vercel.app

## What it uses

- [VAST](https://www.vastdata.com/platform/ai-os) video search over the indexed archive. The desk searches New York and San Francisco street cameras. It does not ask the user to pick one camera.
- Stored clip descriptions from the video stack ([NVIDIA Cosmos](https://www.nvidia.com/en-us/ai/cosmos/) and YOLO, running on [CoreWeave](https://coreweave.com/) GPUs). The desk shows those captions. It does not invent events the captions do not contain.
- Next.js, deployed on Vercel. Cases stay in the browser.

The search is color, vehicle type, city, and an optional time window. Plates and make or model are not in this index, so the desk does not ask for them. Stolen and hit-and-run are marks a person sets after watching a clip. They are not part of the search.

## Run locally

```bash
npm install
npm run dev
```

Set `VSS_BACKEND`, `VSS_USERNAME`, and `VSS_PASSWORD` in the environment. Those are the video search API credentials. Do not commit them.
