# Witness desk

Find one vehicle across every camera in a city.

A witness gives the city, an optional time, the body type, and the color. Witness desk searches the indexed footage and lays the closest clips out as a network. You watch each clip, mark yes or no, and keep a still with the case.

Live site: https://witness-desk.vercel.app

## How to use it

Open the live site. Cases stay in this browser, so a new visitor starts with an empty desk.

1. Choose **Submit new case**.
2. **Where was it?** Pick New York or San Francisco. The desk searches every camera in that city.
3. **When was it?** The date starts on a day the archive actually covers: October 8, 2026 for New York, and October 1, 2026 for San Francisco. San Francisco also has footage from October 6. Pick **Morning**, **Evening**, or **Any time**, then **Use this morning**, **Use this evening**, or **Use this day**. Choose **I don't know** to search the whole archive for that city.
4. **What kind of vehicle?** Pick taxi, bus, SUV, truck, or car.
5. **What color?** Pick yellow, white, black, silver, blue, or red. That choice starts the search.
6. Wait while the closest clips light up. They land as a network. Brighter nodes scored higher. Select a node to play that camera. The line under the video is the stored caption for that clip.
7. Watch the clip. **Yes, this is it** freezes the frame so you can zoom it. **No** clears that clip and plays the next one.
8. After a yes, type the plate if you can read it, add a note, and mark **Stolen** or **Hit and run** when either applies. A muddy frame can be filed with the plate left blank. Choose **File case**.
9. **File case** returns you to **Cases**, where that match is listed as closed. A search you have not marked yet stays under **Open cases** on the home page. Open either one to keep watching the remaining clips.

## What it uses

- [VAST](https://www.vastdata.com/platform/ai-os) video search over the indexed archive. The desk searches New York and San Francisco street cameras. It does not ask the user to pick one camera.
- Stored clip descriptions from the video stack ([NVIDIA Cosmos](https://www.nvidia.com/en-us/ai/cosmos/) and YOLO, running on [CoreWeave](https://coreweave.com/) GPUs). The desk shows those captions. It does not invent events the captions do not contain.
- Next.js, deployed on Vercel. Cases stay in the browser.

The search is color, vehicle type, city, and an optional time window. The index does not read plates or make and model. After a yes, the officer zooms the frozen frame, types the plate they can see, and marks stolen or hit and run. Those marks are not part of the search. A plate is optional when the frame is too muddy to read.

## Run locally

```bash
npm install
npm run dev
```

Set `VSS_BACKEND`, `VSS_USERNAME`, and `VSS_PASSWORD` in the environment. Those are the video search API credentials. Do not commit them.
