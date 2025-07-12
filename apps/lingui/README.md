# @vite-rsc-experiments/lingui

This setup is in theory a bit different than what Lingui docs show for RSC - https://lingui.dev/tutorials/react-rsc

Initially I had a bit different approach - you can see past examples but landed on something much easier. Instead of loading catalogs in React Server I pass them into the client as client references 😄

Since `Trans` component will usually be a leaf one - it doesn't change anything to use it as a client component. This will result in optimal loading/caching etc. We also don't need to be worried about loading them on the client at all - it's all handled from RSC side. Also it makes it automatically working with loading only needed messages, handling language change by action etc.
