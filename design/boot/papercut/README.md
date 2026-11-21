# Paper-cut boot film

`FluddBoot.tsx` is a Remotion composition: 132 frames at 30 fps (4.4 s), in two sizes registered in `Root.tsx`
(1440x900 for wide screens, 780x1688 for phones). Every piece is a cut sheet with a rough edge, a drop shadow
and paper grain, moved on twos. The wordmark and caption are HTML over the video (`web/components/boot/`).

To render: put these three files in the `src/` of any Remotion 4 project with a paper grain image at
`public/bg/grain.png`, then

    npx remotion render BootDesktop out/desktop.mp4 --crf=10 --image-format=png
    npx remotion render BootPhone out/phone.mp4 --crf=10 --image-format=png

and encode to `web/public/boot/boot-{desktop,phone}.{mp4,webm,jpg}` with FFmpeg (poster = frame 6).
