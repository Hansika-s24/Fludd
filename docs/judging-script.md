# Fludd: what we say to the judges

3½ minutes, then the phone goes into their hands.

Scorecard: Technical 25 · Innovation 20 · Track 20 · Execution 20 · Presentation 15.
Every line below is short on purpose. Say it slower than feels natural. Look at the judges, not the screen.

**Set up before they arrive:** phone on fludd.app (Home Screen icon), home set to **1514 E 139th Ave**, the **Now** chip on. Laptop: the 42-second film, paused on frame one, sound up. Backup tab: `fludd.app/demo`.

---

## 0:00 · Harshith · why we built it

*Phone in your pocket. Nothing on screen. Just talk.*

> October 9th, 2024. Hurricane Milton.
>
> Eleven and a half inches of rain fell on Tampa in one day. More than this city had ever seen in a whole October.
>
> That night, firefighters pulled more than five hundred people out of flooded homes.
>
> Around this campus alone, the county counted five hundred and forty-seven flooded properties.
>
> And two hundred and seven of them? The official flood map said *minimal flood hazard*.
>
> If you rented one of those apartments, nobody warned you. Nobody hands a renter a flood report.

*Pause. One full second.*

## 0:40 · Harshith · what it is

*Take out the phone. Hold it up.*

> So we built one. This is Fludd.
>
> Type any address in Tampa. You get a flood grade, you see where the water goes hour by hour, and it tells you when to move your car.
>
> On a normal day, like today, it's live: rain, river levels, alerts.

> We built all of it today. Hansika built the engine.

## 1:00 · Hansika · how it works

*Phone or laptop. Point at one thing at a time.*

> Most flood maps are a yes-or-no line drawn years ago. Ours actually moves water.
>
> We took laser scans of the ground and found every low spot, eight and a half thousand of them, and where each one overflows into the next. Rain fills them hour by hour, and you can switch the pump stations off, like Milton did.
>
> Then the roads. Every street gets its own closing time, for a car, a truck, a fire engine. That's how it can say *move your car by 6 pm*, or *fire trucks can reach you until 9*.

*Tap the pelican.*

> You can just ask. "I need groceries." Pelican finds an open store and routes you only on roads that stay dry.

*Open Food & help.*

> And neighbours help each other. Send a photo of flooding and it reads the depth. Restaurants can offer meals, and anyone can ask for food, with no name attached.

> Does it work? We checked it against Milton. Together with FEMA's map, it flags eighty-seven percent of the real damage. And of the two hundred and seven homes FEMA's map missed, we caught a hundred and thirty-six.

## 2:15 · the film

> Here's what that feels like.

*Hansika presses play. Say nothing for 42 seconds. Let it land.*

## 2:57 · Harshith · close

> It's live right now, at fludd.app.
>
> It's for the student signing a lease next month, and for everyone who's stuck at home when the next storm hits.
>
> And it will never tell you a flooded road is safe.

*Hold out the phone.*

> Try it yourself.

## 3:30 · the judge holds the phone

Give them three things, then stop talking:

1. "Tap any building on the map." *(It gets its own grade.)*
2. "Tap Storm mode, then Play." *(Watch the water spread; the meter climbs.)*
3. "Tap the pelican. Ask for groceries." *(A route around the water.)*

Answer only what they ask.

---

## Questions

**"So it's 87% accurate?"** *(Hansika)*
"No, and that matters to us. On its own the model hits 52%. Together with FEMA's map it's 87%, because ours finds what theirs misses. We never tuned it to those points."
*Never let 87% stand as the model's own number.*

**"What did you build, and what did AI build?"** *(each for your own side)*
"We made every decision: the model, the grading rule, the design, every safety line. Claude Code and Codex wrote code to those decisions. Inside the app, Gemini only reads what you type and what's in a photo. The grade, the map and the routes never use AI."

**"Isn't this just Google Maps?"** *(Hansika)*
"Google finds out a road is flooded after someone reports it. We predict how deep, for your vehicle, hours before anyone drives there."

**"What about privacy?"** *(Harshith)*
"Your home and car never leave your phone. Photos lose their location data and a person checks each one. Food requests keep only a rough area and disappear after two days."

**"Does it cover all of Tampa?"** *(Harshith)*
"Search, weather, river gauges and food help work across Tampa. The flood model covers sixteen square miles around USF today; the city-wide run is set up and next."

## If something breaks

- **Wi-Fi drops:** phone hotspot. The film plays from the laptop either way.
- **App freezes:** switch to `fludd.app/demo` and keep talking.
- **Pelican can't route:** "The router's busy," and open Food & help instead.

## Sources for the opening

- 11.43 in in one day, wettest October on record: [NWS Milton summary](https://www.weather.gov/media/tbw/TropicalEventSummary/PSHTBW_2024AL14_Milton_Summary.pdf)
- 500+ rescued that night: [Axios Tampa Bay](https://www.axios.com/local/tampa-bay/2024/10/10/tampa-bay-flooding-recovery-hurricane-milton)
- 547 damaged, 207 outside high-risk zones, 136 caught, 87% together: our `validation.json`, from Hillsborough County's damage records
