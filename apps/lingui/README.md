# @vite-rsc-experiments/lingui

This setup is in theory a bit different than what Lingui docs show for RSC - https://lingui.dev/tutorials/react-rsc

The issue here is that the setup from the docs are limited by what Next.js allow and catered for it. With e.g. Vite RSC we have full access to our entrypoints so we can easily create i18n instance once. I also omit using i18n in the RSC world intentionally. It's much better imho to send language and let browser load proper locale (which can be cached etc) then pollute RSC payload with it.

~~This example is also not perfect, but it's the simplest form which would need to be improved for serious usage - handling language change, loading only one messages bundle etc~~

I fixed it mostly and I think that's the way 😄 I got a cool new idea - messages can be client references! Then we don't need to be worried about loading them on the client at all - it's all handled from RSC side. Also it makes it automatically working with loading only needed messages, handling language change by action etc.
