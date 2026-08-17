/*!
 * splash-iframe-scroller — the article page's companion for Splash embeds.
 * Drop it on any page that carries one or more Splash iframes. One file, no dependency.
 *
 *   <script src="/assets/splash-iframe-scroller.js"><\/script>
 *   <script>splashScroller({ offset: "nav" });<\/script>   // offset: selector, number, or function
 *
 * (closing tags above are escaped with a backslash — this file is sometimes inlined verbatim
 * inside a delivered page's own script block, where that closing sequence unescaped, even inside
 * a comment, would end the block early and truncate the page)
 *
 * It does TWO things, and nothing else:
 *   1. CENTRES an embed under the site's sticky furniture once the reader has arrived on it.
 *   2. HANDS THE READER BACK at the end of a scrolly, which cannot escape on its own.
 *
 * It NEVER sets a width or a height. The site sizes its iframes in its own CSS, at its own
 * breakpoints — that is what makes this work on any site rather than on the one it was written for.
 */
(function (global) {
  "use strict";

  var SETTLED_MS = 140; // the reader must pause this long before we call it an arrival
  var TRAVEL_MS = 700; // how long our own smooth scroll is allowed to be in flight
  var EDGE_PX = 4; // don't move the page for less than this

  function resolveOffset(offset, doc) {
    if (typeof offset === "number") return offset;
    if (typeof offset === "function") return Number(offset()) || 0;
    if (typeof offset === "string") {
      var el = doc.querySelector(offset);
      return el ? Math.round(el.getBoundingClientRect().height) : 0;
    }
    return 0;
  }

  /* The message a Splash embed sends. Guarded on shape, because every other embed on a news page
     (ads, tweets, Datawrapper) posts something, and most of it is not an object. */
  function parse(data) {
    if (!data || typeof data !== "object") return null;
    if (data.splash !== 1 || typeof data.type !== "string") return null;
    return data;
  }

  function splashScroller(options) {
    var opts = options || {};
    var doc = global.document;
    if (global.__splashScroller) return global.__splashScroller.configure(opts);

    /* TWO WAYS TO RECOGNISE ONE OF OUR EMBEDS, because a journalist may only be able to hand their
       CMS a URL — the CMS then builds the iframe markup itself and our attribute never survives.
       So the URL we hand out carries the mark instead: `…/mon-visuel/?splash`. Nothing more: the
       GENRE is deliberately absent, because this script does not need it. It centres every embed
       the same way, and the only genre that ever speaks (a scrolly, through its own emitter) says
       so by speaking. A parent page does not have to be told what it is showing. */
    var selector =
      opts.selector || "[data-splash-embed], iframe[src*='splash']";
    var offset = opts.offset;
    var reduced =
      typeof global.matchMedia === "function" &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var embeds = []; // {el, win, armed}
    var travelling = false;
    var settleTimer = null;

    function scrollPageTo(target) {
      travelling = true;
      global.scrollTo({
        top: target,
        left: 0,
        behavior: reduced ? "auto" : "smooth",
      });
      global.setTimeout(function () {
        travelling = false;
      }, TRAVEL_MS);
    }

    function centre(entry) {
      var line = resolveOffset(offset, doc);
      var target = Math.max(
        0,
        Math.round(
          entry.el.getBoundingClientRect().top + global.scrollY - line,
        ),
      );
      if (Math.abs(target - global.scrollY) < EDGE_PX) return;
      scrollPageTo(target);
    }

    /* WHICH EMBED THE READER IS ON: the one whose top sits nearest the furniture line, among those
       in view. Deliberately not "the most visible one" — an embed TALLER than the window can never
       be mostly visible, so a visibility threshold silently skips exactly the big ones. */
    function considerArrival() {
      if (travelling) return;
      var vh = global.innerHeight;
      var line = resolveOffset(offset, doc);
      var best = null;
      var bestDistance = Infinity;
      for (var i = 0; i < embeds.length; i++) {
        var entry = embeds[i];
        if (!entry.armed) continue;
        var r = entry.el.getBoundingClientRect();
        if (r.bottom <= line + 40 || r.top >= vh - 40) continue; // not in view
        if (r.top > vh * 0.6) continue; // still well below: not the one being read
        var d = Math.abs(r.top - line);
        if (d < bestDistance) {
          bestDistance = d;
          best = entry;
        }
      }
      if (!best) return;
      best.armed = false; // once per arrival; re-armed when it leaves the viewport entirely
      centre(best);
    }

    function rearm() {
      var vh = global.innerHeight;
      for (var i = 0; i < embeds.length; i++) {
        var r = embeds[i].el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= vh) embeds[i].armed = true;
      }
    }

    function scan() {
      var found = doc.querySelectorAll(selector);
      for (var i = 0; i < found.length; i++) {
        var el = found[i];
        if (el.tagName !== "IFRAME") continue;
        var known = null;
        for (var k = 0; k < embeds.length; k++)
          if (embeds[k].el === el) known = embeds[k];
        if (known) {
          if (!known.win) known.win = el.contentWindow; // heals a frame that had no window yet
          continue;
        }
        // `src*='splash'` is a coarse CSS match (it would catch a host merely NAMED splash), so the
        // real test happens here: our own attribute, or `?splash` / `&splash` in the query.
        var marked =
          el.hasAttribute("data-splash-embed") ||
          /[?&]splash(=|&|$)/.test(el.getAttribute("src") || "");
        if (!marked) continue;
        embeds.push({ el: el, win: el.contentWindow, armed: true });
      }
    }

    /* THE ONE THING AN EMBED HAS TO TELL US, and only a scrolly ever does: the reader is scrolling
       inside it, and — when they push past the end — that we should carry them out. A cross-origin
       frame's inner scrollport is invisible from here, which is why this message exists at all. */
    global.addEventListener("message", function (event) {
      var message = parse(event.data);
      if (!message) return;
      // No genre check: the message can only come from a window this page embedded (matched by
      // source), and only a scrolly ever sends one.
      var entry = null;
      for (var i = 0; i < embeds.length; i++)
        if (embeds[i].win === event.source) entry = embeds[i];
      if (!entry) return;

      if (message.type === "scrolling" && entry.armed) {
        entry.armed = false;
        centre(entry);
        return;
      }
      if (message.type === "release") {
        var r = entry.el.getBoundingClientRect();
        var line = resolveOffset(offset, doc);
        entry.armed = false;
        scrollPageTo(
          message.direction === "up"
            ? Math.max(0, global.scrollY + r.top - global.innerHeight)
            : Math.max(0, global.scrollY + r.bottom - line),
        );
      }
    });

    global.addEventListener(
      "scroll",
      function () {
        rearm();
        if (settleTimer) global.clearTimeout(settleTimer);
        settleTimer = global.setTimeout(considerArrival, SETTLED_MS);
      },
      { passive: true },
    );

    /* SAY SO WHEN THERE IS NOTHING TO DO. Measured on 20min.ch: five published articles carry an
       embed block with one missing quote, so the parser swallows the iframe and the container's
       class becomes garbage. Three of them load this script, which then finds nothing and — before
       this warning existed — said nothing at all. The visual was simply absent from the article,
       silently, for anyone who did not open the DOM inspector. A script that can do nothing must
       not be indistinguishable from a script that is working. */
    function warnIfEmpty() {
      if (embeds.length > 0) return;
      var suspects = doc.querySelectorAll(
        '[class*="splash-embed"], [class*="visuals-immersive"]',
      );
      var hint =
        suspects.length > 0
          ? " A container matching that name IS on the page — check the embed block for a broken quote."
          : "";
      if (global.console && global.console.warn)
        global.console.warn(
          "splash-iframe-scroller: no embed matched " +
            JSON.stringify(selector) +
            "." +
            hint,
        );
    }

    var api = {
      configure: function (next) {
        if (next && next.selector) selector = next.selector;
        if (next && "offset" in next) offset = next.offset;
        scan();
        return api;
      },
      refresh: function () {
        scan();
        return api;
      },
      embeds: embeds,
    };
    global.__splashScroller = api;
    scan();
    global.setTimeout(warnIfEmpty, 1200); // after late-injected CMS content has had its chance
    if (doc.readyState === "loading")
      doc.addEventListener("DOMContentLoaded", function () {
        api.refresh();
      });
    return api;
  }

  global.splashScroller = splashScroller;
})(window);
