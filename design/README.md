# OBH Invites — app design canvas

Mockups of the mobile app restyled to match the website (invites.falcon83.com):
same black/gold `theme.css` tokens, the real OBH wordmark + night team logos,
stroke icons instead of emoji. 10 artboards: Login, Home, Foundations (style
guide), Events, Event detail (player), Event detail (director), Messages,
Profile, New event, States.

The Pi has no `node`, so the canvas has to be assembled on the Mac.

## On the Mac

```bash
# 1. copy this folder over
scp -r jvmalone@192.168.86.59:/home/jvmalone/invite-app/design ~/obh-design
cd ~/obh-design

# 2. assemble
node seed-canvas.mjs \
  --template ./payload.template.html \
  --out obh-invites-app.html \
  --title "OBH Invites App" \
  --artboard Main.dc.html --artboard Login.dc.html --artboard Foundations.dc.html \
  --artboard Events.dc.html --artboard EventDetail.dc.html --artboard EventDetailDirector.dc.html \
  --artboard Messages.dc.html --artboard Profile.dc.html --artboard NewEvent.dc.html --artboard States.dc.html \
  --image wordmark.png --image hero.jpg --image crest.jpg \
  --image night_monday.jpg --image night_wednesday.jpg --image night_thursday.jpg --image night_sunday.jpg \
  --canvas canvas.json

# 3. verify — should print "ok:" with the title and 10 .dc.html files
node seed-canvas.mjs --check obh-invites-app.html

# 4. send it back to the Pi
scp obh-invites-app.html jvmalone@192.168.86.59:/home/jvmalone/invite-app/design/
```

Then tell Claude on the Pi — it publishes `obh-invites-app.html` as a shareable
canvas.

## Editing later

Change the `.dc.html` working files here, re-run step 2, send the new
`obh-invites-app.html` back, Claude republishes to the same link.
