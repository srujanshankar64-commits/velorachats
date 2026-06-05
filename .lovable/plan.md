## Goal

Defer all 4 Monetag ad scripts until the user first interacts with the page (click, scroll, touch, or keypress), or after a safety timeout (~4s) if no interaction happens. Ads still load — just not during the critical render path. No visual or UX changes.

## Why

Even with `async`/`defer`, the 4 Monetag scripts (`5gvci.com`, `nap5k.com`, `n6wxm.com`, `omg10.com`) start downloading + executing during the initial load, consuming main-thread time and competing with React hydration. This hurts LCP and INP. Delaying them until after first interaction moves them entirely out of the critical path.

## Changes

**1. `index.html`** — Remove the 4 Monetag `<script>` tags (lines 30–33). Keep Google Analytics, notifications, preconnects untouched.

**2. `index.html`** — Add a tiny inline bootstrap script that:
- Listens once for `pointerdown`, `keydown`, `scroll`, `touchstart` (passive)
- Also sets a `setTimeout` fallback (~4000ms) so ads still load for passive users
- On trigger, dynamically injects the 4 Monetag scripts in the same order with the same `data-zone` / `z=` parameters
- Self-removes its listeners after first fire

**3. Preserve revenue**: keep the `<div id="monetag-ipp">` container in `__root.tsx` so in-page push has its slot the moment scripts load.

**4. Keep `dns-prefetch` hints** for the 4 ad domains so when they do load, DNS is already resolved (zero perf cost before fire).

## Technical detail

```html
<!-- in <head>, replacing current Monetag block -->
<link rel="dns-prefetch" href="https://5gvci.com" />
<link rel="dns-prefetch" href="https://nap5k.com" />
<link rel="dns-prefetch" href="https://n6wxm.com" />
<link rel="dns-prefetch" href="https://omg10.com" />
<script>
(function(){
  var loaded=false;
  function load(){
    if(loaded)return;loaded=true;
    var d=document,h=d.head||d.documentElement;
    function s(src,attrs){var x=d.createElement('script');x.src=src;x.async=true;
      if(attrs)for(var k in attrs)x.setAttribute(k,attrs[k]);h.appendChild(x);}
    s('https://5gvci.com/act/files/tag.min.js?z=11068726',{'data-cfasync':'false'});
    var a=d.createElement('script');a.dataset.zone='11068721';a.src='https://nap5k.com/tag.min.js';h.appendChild(a);
    var b=d.createElement('script');b.dataset.zone='11068748';b.src='https://n6wxm.com/vignette.min.js';h.appendChild(b);
    s('https://omg10.com/4/11068749',{'data-cfasync':'false'});
    rm();
  }
  var evts=['pointerdown','keydown','touchstart','scroll'];
  function rm(){evts.forEach(function(e){window.removeEventListener(e,load,{passive:true});});}
  evts.forEach(function(e){window.addEventListener(e,load,{passive:true,once:true});});
  setTimeout(load,4000);
})();
</script>
```

## Expected impact

- **LCP**: −200 to −500ms on landing page (no third-party JS competes with hero render)
- **INP**: significant improvement since ad script execution shifts out of initial interaction window
- **Revenue**: unaffected — ads still fire within ~4s or on first interaction (whichever first), which is when users see/scroll past them anyway
- **Visuals**: zero change

## Out of scope

- Self-hosting fonts (separate pass)
- Removing ads from specific routes
- Any UI/UX/design changes
