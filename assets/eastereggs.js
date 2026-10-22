(() => {
    "use strict";
    // Shared sky scenery stays behind the page and never intercepts input.
    if (!document.querySelector(".pixel-sky")) {
        const sky = document.createElement("div"); sky.className = "pixel-sky"; sky.setAttribute("aria-hidden", "true");
        const moon = document.createElement("span"); moon.className = "sky-moon"; sky.append(moon);
        for (const [left, top, duration, delay] of [[35, 3, 9, -.4], [72, 10, 9, -1.9], [98, 28, 9, -3.4], [46, 35, 9, -4.9], [83, 2, 9, -6.4], [26, 46, 9, -7.9]]) {
            const star = document.createElement("span"); star.className = "shooting-star";
            star.style.cssText = `--star-left:${left}%;--star-top:${top}%;--star-duration:${duration}s;--star-delay:${delay}s`;
            sky.append(star);
        }
        document.body.prepend(sky);
    }
    const robotSource = new URL("vojta-mark.svg", document.currentScript.src).href;
    const robotNightSource = new URL("vojta-mark-night.svg", document.currentScript.src).href;
    const trainerScript = new URL("headshot.js", document.currentScript.src).href;
    const trainerStyle = new URL("headshot.css", document.currentScript.src).href;
    let trainerLoading;
    function openTrainer() {
        if (!trainerLoading) trainerLoading = Promise.all([
            new Promise((resolve, reject) => {
                const link = document.createElement("link"); link.rel = "stylesheet"; link.href = trainerStyle;
                link.onload = resolve; link.onerror = () => { link.remove(); reject(new Error("Trainer stylesheet unavailable")); };
                document.head.append(link);
            }),
            new Promise((resolve, reject) => {
                const script = document.createElement("script"); script.src = trainerScript;
                script.onload = resolve; script.onerror = () => { script.remove(); reject(new Error("Trainer script unavailable")); };
                document.head.append(script);
            })
        ]).catch(error => { trainerLoading = null; throw error; });
        trainerLoading.then(() => { window.VojtaHeadshot.open(); remember("headshot"); }).catch(() => {
            toast("TRÉNINK SE NENAČETL", "Zkus za chvíli znovu napsat HEADSHOT.");
        });
    }
    function syncArtwork() {
        const enabled = document.documentElement.dataset.palette === "night";
        document.querySelectorAll("img[data-secret-src]").forEach(image => {
            if (!image.dataset.originalSrc) image.dataset.originalSrc = image.getAttribute("src");
            image.setAttribute("src", enabled ? image.dataset.secretSrc : image.dataset.originalSrc);
        });
    }
    const paletteKey = "vojta.palette.v1";
    const paletteSwitch = document.createElement("button");
    paletteSwitch.type = "button";
    paletteSwitch.className = "palette-switch";
    paletteSwitch.setAttribute("role", "switch");
    paletteSwitch.setAttribute("aria-label", "Noční barevná paleta");
    for (const palette of ["forest", "night"]) {
        const swatch = document.createElement("span");
        swatch.className = "palette-swatch " + palette;
        swatch.setAttribute("aria-hidden", "true");
        paletteSwitch.appendChild(swatch);
    }
    const header = document.querySelector(".nav, .arcade-header, body > nav");
    if (header) { header.classList.add("has-palette-switch"); header.appendChild(paletteSwitch); }
    function setPalette(enabled, save = true) {
        const palette = enabled ? "night" : "forest";
        document.documentElement.dataset.palette = palette;
        paletteSwitch.setAttribute("aria-checked", String(enabled));
        paletteSwitch.title = enabled ? "Přepnout na lesní paletu" : "Přepnout na noční paletu";
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", enabled ? "#202439" : "#1c2a20");
        if (save) { try { localStorage.setItem(paletteKey, palette); } catch { /* Keep the current session's colors. */ } }
        syncArtwork();
        window.dispatchEvent(new CustomEvent("vojta:palettechange"));
    }
    let preferredPalette = "forest";
    try { preferredPalette = localStorage.getItem(paletteKey) || "forest"; } catch { /* Storage is optional. */ }
    setPalette(preferredPalette === "night", false);
    paletteSwitch.addEventListener("click", () => setPalette(document.documentElement.dataset.palette !== "night"));
    window.addEventListener("storage", event => {
        if (event.key === paletteKey || event.key === null) setPalette(event.newValue === "night", false);
    });
    const secretKey = "vojta.secrets.v1";
    const ids = ["robot", "party", "headshot"];
    let found = new Set();
    try {
        const saved = JSON.parse(localStorage.getItem(secretKey));
        if (Array.isArray(saved)) found = new Set(saved.filter(id => ids.includes(id)));
    } catch { /* Secrets also work without storage. */ }
    function updateCount() { document.querySelectorAll("[data-secret-count]").forEach(element => { element.textContent = found.size; }); }
    function remember(id) {
        found.add(id);
        try { localStorage.setItem(secretKey, JSON.stringify([...found])); } catch { /* Keep this session's progress. */ }
        updateCount();
    }
    let toastTimer;
    function toast(title, message) {
        document.querySelector(".secret-toast")?.remove();
        window.clearTimeout(toastTimer);
        const box = document.createElement("div"); box.className = "secret-toast";
        const content = document.createElement("div"); content.setAttribute("role", "status");
        const heading = document.createElement("strong"); heading.textContent = title;
        const text = document.createElement("span"); text.textContent = message;
        content.append(heading, text);
        const close = document.createElement("button"); close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "Zavřít oznámení");
        close.addEventListener("click", () => box.remove());
        box.append(content, close); document.body.appendChild(box);
        toastTimer = window.setTimeout(() => box.remove(), 6500);
    }
    let cancelParty = () => {};
    function confetti() {
        cancelParty();
        const layer = document.createElement("div"); layer.className = "pixel-party"; layer.setAttribute("aria-hidden", "true");
        document.body.appendChild(layer);
        const title = document.createElement("div"); title.className = "party-title"; title.textContent = "PIXEL PARTY!";
        layer.appendChild(title);
        const colors = ["var(--syntax-pink)", "var(--syntax-blue)", "var(--syntax-yellow)", "var(--syntax-purple)", "var(--syntax-mint)"];
        const animations = new Set();
        const timers = new Map();
        let cancelled = false;
        const dispose = () => {
            if (cancelled) return;
            cancelled = true;
            timers.forEach((resolve, id) => { window.clearTimeout(id); resolve(false); }); timers.clear();
            animations.forEach(animation => animation.cancel()); animations.clear();
            layer.remove();
            if (cancelParty === dispose) cancelParty = () => {};
        };
        cancelParty = dispose;
        const wait = delay => new Promise(resolve => {
            if (cancelled) { resolve(false); return; }
            const id = window.setTimeout(() => { timers.delete(id); resolve(true); }, delay);
            timers.set(id, resolve);
        });
        const play = (element, frames, options) => {
            if (cancelled) return Promise.resolve(false);
            const animation = element.animate(frames, options);
            animations.add(animation);
            return animation.finished.then(() => true, () => false).finally(() => animations.delete(animation));
        };
        const cannons = ["left", "right"].map(side => {
            const cannon = document.createElement("div"); cannon.className = "party-cannon party-cannon-" + side;
            cannon.innerHTML = `<div class="cannon-sleeve"><svg viewBox="0 0 48 56" shape-rendering="crispEdges" aria-hidden="true">
                <path fill="var(--shadow)" d="M5 55 9 39 16 23 24 8h7l16 11v7L30 39 12 55z"/>
                <path fill="var(--syntax-purple)" d="M8 52 26 12 41 23 11 52z"/>
                <path fill="var(--syntax-pink)" d="m19 27 5-11 13 10-8 8zM10 47l4-9 10 1-10 10z"/>
                <path fill="var(--syntax-yellow)" d="m15 35 3-7 14 3-5 6z"/>
                <path fill="var(--tea)" d="M25 8h6l14 11v5l-5 2-16-12z"/>
                <path fill="var(--ink)" d="m29 11 12 9-2 3-12-9z"/>
                <path fill="var(--text)" d="M25 9h4l-2 4h-3z"/>
                </svg><span class="cannon-mouth"></span></div>`;
            layer.append(cannon); return cannon;
        });
        function fire(cannon, wave) {
            const direction = cannon.classList.contains("party-cannon-left") ? 1 : -1;
            const mouth = cannon.querySelector(".cannon-mouth").getBoundingClientRect();
            const bounds = layer.getBoundingClientRect();
            const x = mouth.x - bounds.x, y = mouth.y - bounds.y;
            play(cannon, [
                { transform: "translate(0, 0) rotate(0)" },
                { transform: `translate(${-direction * 10}px, 12px) rotate(${-direction * 10}deg)`, offset: .28 },
                { transform: "translate(0, 0) rotate(0)" }
            ], { duration: 300, easing: "ease-out" });
            const flash = document.createElement("span"); flash.className = "cannon-flash";
            flash.style.left = x + "px"; flash.style.top = y + "px"; layer.append(flash);
            play(flash, [{ transform: "translate(-50%, -50%) scale(.5)", opacity: 1 }, { transform: "translate(-50%, -50%) scale(1.7)", opacity: 0 }], { duration: 180 }).then(() => flash.remove());
            for (let i = 0; i < 16; i++) {
                const pixel = document.createElement("span"); pixel.className = "pixel-confetti";
                pixel.style.left = x - 3 + "px"; pixel.style.top = y - 3 + "px";
                pixel.style.setProperty("--confetti-color", colors[(i + wave) % colors.length]);
                pixel.style.height = i % 3 === 0 ? "6px" : "10px";
                layer.append(pixel);
                const distance = direction * (60 + Math.random() * Math.min(bounds.width * .68, 650));
                const height = Math.min(bounds.height * .8, 740) * (.7 + Math.random() * .5);
                const drop = bounds.height - y + 60;
                const spin = (Math.random() - .5) * 1000;
                const frames = Array.from({ length: 21 }, (_, step) => {
                    const time = step / 20;
                    return { offset: time, transform: `translate(${distance * time}px, ${-4 * height * time * (1 - time) + drop * time * time}px) rotate(${spin * time}deg)`, opacity: time < .8 ? 1 : (1 - time) / .2 };
                });
                play(pixel, frames, { duration: 1900 + Math.random() * 550, easing: "linear" }).then(() => pixel.remove());
            }
        }
        async function runParty() {
            layer.dataset.phase = "entering";
            const entered = await Promise.all(cannons.map((cannon, index) => play(cannon, [
                { transform: `translateY(150%) rotate(${index ? 15 : -15}deg)` },
                { transform: "translateY(-5px) rotate(0deg)", offset: .8 },
                { transform: "translateY(0) rotate(0deg)" }
            ], { duration: 480, easing: "cubic-bezier(.2,.7,.3,1)" })));
            if (cancelled || entered.includes(false)) return;
            layer.dataset.phase = "firing";
            for (let wave = 0; wave < 3; wave++) {
                cannons.forEach(cannon => fire(cannon, wave));
                if (wave < 2 && !await wait(420)) return;
            }
            layer.dataset.phase = "settling";
            if (!await wait(2500)) return;
            layer.dataset.phase = "leaving";
            await Promise.all([
                ...cannons.map((cannon, index) => play(cannon, [
                    { transform: "translateY(0) rotate(0deg)" },
                    { transform: `translateY(150%) rotate(${index ? 15 : -15}deg)` }
                ], { duration: 480, easing: "cubic-bezier(.5,0,.8,.4)" })),
                play(title, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 })
            ]);
        }
        runParty().then(dispose, dispose);
    }
    function toggleRobot() {
        remember("robot");
        const existing = document.querySelector(".secret-buddy");
        if (existing) { existing.remove(); return; }
        const buddy = document.createElement("div"); buddy.className = "secret-buddy";
        const speech = document.createElement("p"); speech.className = "buddy-speech"; speech.textContent = "Ahoj, hráči. Našel jsi mě!"; speech.setAttribute("role", "status");
        const hello = document.createElement("button"); hello.className = "buddy-hello"; hello.type = "button"; hello.setAttribute("aria-label", "Pozdravit robota");
        const image = document.createElement("img"); image.src = robotSource; image.width = 64; image.height = 64; image.alt = "";
        image.dataset.secretSrc = robotNightSource;
        hello.appendChild(image);
        const lines = ["Ještě jeden pokus?", "Nezapomeň uložit. Ctrl + S!", "Vážně pěkné pixely, co?", "Had má hlad. Já taky.", "Moje oblíbená barva? Všechny zelené."];
        let line = 0;
        hello.addEventListener("click", () => { speech.textContent = lines[line++ % lines.length]; });
        const close = document.createElement("button"); close.className = "buddy-close"; close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "Schovat robota");
        close.addEventListener("click", () => buddy.remove());
        buddy.append(speech, hello, close); document.body.appendChild(buddy);
        syncArtwork();
        toast("TAJEMSTVÍ ODEMČENO / ROBOT", "Malý parťák se přišel podívat. Klikni na něj a pozdrav ho.");
    }
    let robotClicks = 0;
    let lastRobotClick = 0;
    document.querySelectorAll(".logo-mark, [data-secret-robot]").forEach(element => {
        element.addEventListener("click", event => {
            const now = performance.now();
            robotClicks = now - lastRobotClick < 1200 ? robotClicks + 1 : 1;
            lastRobotClick = now;
            if (robotClicks >= 5) {
                event.preventDefault(); event.stopPropagation(); robotClicks = 0; toggleRobot();
            }
        });
    });
    let letters = "";
    let lastKey = 0;
    document.addEventListener("keydown", event => {
        if (document.querySelector(".headshot-game[open]")) return;
        if (event.key === "Escape") {
            document.querySelector(".secret-toast")?.remove();
            document.querySelector(".secret-buddy")?.remove();
            cancelParty();
            return;
        }
        if (event.defaultPrevented || event.isComposing || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')) { letters = ""; return; }
        const now = performance.now();
        if (now - lastKey > 2500) letters = "";
        lastKey = now;
        const key = event.key.toLowerCase();
        letters = /^[a-z]$/.test(key) ? (letters + key).slice(-8) : "";
        if (letters === "headshot") { letters = ""; openTrainer(); return; }
        if (letters.endsWith("party")) {
            letters = ""; remember("party"); confetti();
            toast("TAJEMSTVÍ ODEMČENO / PIXEL PARTY", "Někdy je potřeba oslavit i jeden malý pixel.");
            document.querySelector(".secret-toast")?.classList.add("party-toast");
        }
    });
    updateCount();
})();
